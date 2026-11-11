import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { auth, db, ensureFirebaseAuthSession } from './firebase';
import { DbData } from './dbStorage';
import {
  Category,
  Company,
  CompanySubCategory,
  Product,
  Package,
  CompanyImage,
  Advertisement,
  PriceHistory,
  Order,
  CatalogSettings,
  TeamMember,
  PdfDividerAsset,
  SharedCustomCatalog,
} from '../types';

export interface CloudSyncStatus {
  connected: boolean;
  lastSyncedAt?: string;
  error?: string;
  counts?: {
    products: number;
    companies: number;
    orders: number;
    customCatalogs: number;
  };
}

function toSafeDocId(rawId: string): string {
  const cleaned = String(rawId || 'DOC')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, 120) || `DOC_${Date.now()}`;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

async function fetchCollectionList<T>(colName: string): Promise<T[] | null> {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map((d) => d.data() as T);
  } catch {
    return null;
  }
}

async function ensureAuthorizedWriteSession(): Promise<boolean> {
  await auth.authStateReady();
  const user = auth.currentUser || (await ensureFirebaseAuthSession());
  return Boolean(user);
}

export const firestoreSync = {
  /**
   * Pulls all public & operational collections from Cloud Firestore.
   * Collections that fail (e.g. auth rules before Google login) return null gracefully.
   */
  async pullAllFromCloud(): Promise<{
    connected: boolean;
    data: Partial<DbData> & { pdfDividers?: PdfDividerAsset[] };
    error?: string;
  }> {
    try {
      await auth.authStateReady();
      await ensureFirebaseAuthSession();

      const [
        categories,
        companies,
        subCategories,
        products,
        packages,
        advertisements,
        images,
        pdfDividers,
        orders,
        teamMembers,
        priceHistory,
      ] = await Promise.all([
        fetchCollectionList<Category>('categories'),
        fetchCollectionList<Company>('companies'),
        fetchCollectionList<CompanySubCategory>('subCategories'),
        fetchCollectionList<Product>('products'),
        fetchCollectionList<Package>('packages'),
        fetchCollectionList<Advertisement>('advertisements'),
        fetchCollectionList<CompanyImage>('images'),
        fetchCollectionList<PdfDividerAsset>('pdfDividers'),
        fetchCollectionList<Order>('orders'),
        fetchCollectionList<TeamMember>('team'),
        fetchCollectionList<PriceHistory>('priceHistory'),
      ]);

      let settings: CatalogSettings | undefined;
      let settingsReadOk = false;
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
        settingsReadOk = true;
        if (settingsSnap.exists()) {
          settings = settingsSnap.data() as CatalogSettings;
        }
      } catch {
        settingsReadOk = false;
      }

      const anyReadSucceeded =
        settingsReadOk ||
        [categories, companies, products, packages].some((arr) => arr !== null);

      const data: Partial<DbData> & { pdfDividers?: PdfDividerAsset[] } = {};
      if (categories && categories.length > 0) {
        data.categories = categories.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      }
      if (companies && companies.length > 0) {
        data.companies = companies.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      }
      if (subCategories && subCategories.length > 0) data.subCategories = subCategories;
      if (products && products.length > 0) {
        data.products = products.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      }
      if (packages && packages.length > 0) {
        data.packages = packages.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      }
      if (advertisements && advertisements.length > 0) {
        data.advertisements = advertisements.sort(
          (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)
        );
      }
      if (images && images.length > 0) data.images = images;
      if (pdfDividers && pdfDividers.length > 0) data.pdfDividers = pdfDividers;
      if (orders && orders.length > 0) {
        data.orders = orders.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (teamMembers && teamMembers.length > 0) data.teamMembers = teamMembers;
      if (priceHistory && priceHistory.length > 0) data.priceHistory = priceHistory;
      if (settings) data.settings = settings;

      return {
        connected: anyReadSucceeded,
        data,
      };
    } catch (err: any) {
      return {
        connected: false,
        data: {},
        error: err?.message || 'تعذر الاتصال بقاعدة بيانات Firebase',
      };
    }
  },

  /**
   * Synchronizes an array of ID-keyed items to Cloud Firestore using batches,
   * deleting removed docs if they exist remotely.
   */
  async syncCollection<T extends { id: string }>(colName: string, items: T[]): Promise<boolean> {
    try {
      if (!(await ensureAuthorizedWriteSession())) return false;
      const targetIds = new Set(items.map((it) => toSafeDocId(it.id)));

      let existingIds: string[] = [];
      try {
        const snap = await getDocs(collection(db, colName));
        existingIds = snap.docs.map((d) => d.id);
      } catch {
        // Proceed with upsert even if read failed
      }

      const ops: Array<{ type: 'set' | 'delete'; id: string; payload?: any }> = [];
      for (const item of items) {
        const safeId = toSafeDocId(item.id);
        ops.push({
          type: 'set',
          id: safeId,
          payload: stripUndefined(item),
        });
      }
      for (const oldId of existingIds) {
        if (!targetIds.has(oldId)) {
          ops.push({ type: 'delete', id: oldId });
        }
      }

      // Firestore batch limit is 500 writes -> chunk cleanly by 400
      for (let i = 0; i < ops.length; i += 400) {
        const slice = ops.slice(i, i + 400);
        const batch = writeBatch(db);
        for (const op of slice) {
          const ref = doc(db, colName, op.id);
          if (op.type === 'set') {
            batch.set(ref, op.payload);
          } else {
            batch.delete(ref);
          }
        }
        await batch.commit();
      }
      return true;
    } catch (err) {
      console.warn(`[Firestore Sync] Failed syncing "${colName}":`, err);
      return false;
    }
  },

  async saveSettings(settings: CatalogSettings): Promise<boolean> {
    try {
      if (!(await ensureAuthorizedWriteSession())) return false;
      await setDoc(doc(db, 'settings', 'main'), stripUndefined(settings));
      return true;
    } catch (err) {
      console.warn('[Firestore Sync] Failed saving settings:', err);
      return false;
    }
  },

  async saveOrder(order: Order): Promise<boolean> {
    try {
      const safeId = toSafeDocId(order.id || order.orderNumber);
      await setDoc(doc(db, 'orders', safeId), stripUndefined(order));
      return true;
    } catch (err) {
      console.warn('[Firestore Sync] Failed saving order:', err);
      return false;
    }
  },

  async updateOrderStatus(orderNumberOrId: string, status: Order['status']): Promise<boolean> {
    try {
      if (!(await ensureAuthorizedWriteSession())) return false;
      const safeDirectId = toSafeDocId(orderNumberOrId);
      const directRef = doc(db, 'orders', safeDirectId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        await setDoc(
          directRef,
          stripUndefined({ ...directSnap.data(), status, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
        return true;
      }

      const q = query(collection(db, 'orders'), where('orderNumber', '==', orderNumberOrId), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const foundDoc = snap.docs[0];
        await setDoc(
          foundDoc.ref,
          stripUndefined({ ...foundDoc.data(), status, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Firestore Sync] Failed updating order status:', err);
      return false;
    }
  },

  async fetchOrderFromCloud(orderParam: string): Promise<Order | null> {
    try {
      await auth.authStateReady();
      await ensureFirebaseAuthSession();
      const directSnap = await getDoc(doc(db, 'orders', toSafeDocId(orderParam)));
      if (directSnap.exists()) return directSnap.data() as Order;

      const q = query(collection(db, 'orders'), where('orderNumber', '==', orderParam), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0].data() as Order;
      return null;
    } catch {
      return null;
    }
  },

  async saveSharedCatalog(catalog: SharedCustomCatalog): Promise<boolean> {
    try {
      if (!(await ensureAuthorizedWriteSession())) return false;
      await setDoc(doc(db, 'customCatalogs', toSafeDocId(catalog.id)), stripUndefined(catalog));
      return true;
    } catch (err) {
      console.warn('[Firestore Sync] Failed saving shared catalog:', err);
      return false;
    }
  },

  async fetchSharedCatalog(catalogId: string): Promise<SharedCustomCatalog | null> {
    try {
      const snap = await getDoc(doc(db, 'customCatalogs', toSafeDocId(catalogId)));
      return snap.exists() ? (snap.data() as SharedCustomCatalog) : null;
    } catch {
      return null;
    }
  },

  /**
   * Pushes full local state to Cloud Firestore (used for initial seeding or manual full sync).
   */
  async pushFullSnapshot(
    snapshot: DbData & { pdfDividers?: PdfDividerAsset[] }
  ): Promise<{ success: boolean; syncedCollections: number; error?: string }> {
    if (!(await ensureAuthorizedWriteSession())) {
      return {
        success: false,
        syncedCollections: 0,
        error: 'يرجى الضغط على "تسجيل Google للسحابة" أولاً لحفظ ومزامنة البيانات.',
      };
    }

    let syncedCollections = 0;
    let lastError: string | undefined;

    const tasks: Array<Promise<boolean>> = [
      this.syncCollection('categories', snapshot.categories || []),
      this.syncCollection('companies', snapshot.companies || []),
      this.syncCollection('subCategories', snapshot.subCategories || []),
      this.syncCollection('products', snapshot.products || []),
      this.syncCollection('packages', snapshot.packages || []),
      this.syncCollection('advertisements', snapshot.advertisements || []),
      this.syncCollection('images', snapshot.images || []),
      this.syncCollection('pdfDividers', snapshot.pdfDividers || []),
      this.syncCollection('orders', snapshot.orders || []),
      this.syncCollection('team', snapshot.teamMembers || []),
      this.syncCollection('priceHistory', snapshot.priceHistory || []),
      this.saveSettings(snapshot.settings),
    ];

    try {
      const results = await Promise.all(tasks);
      syncedCollections = results.filter(Boolean).length;
      if (syncedCollections === 0) {
        lastError =
          'لم يتم السماح بالكتابة على Firestore — تأكد من نشر firestore.rules أو تسجيل الدخول بحساب Google.';
      }
      return { success: syncedCollections > 0, syncedCollections, error: lastError };
    } catch (err: any) {
      return {
        success: false,
        syncedCollections,
        error: err?.message || 'فشل المزامنة السحابية',
      };
    }
  },
};
