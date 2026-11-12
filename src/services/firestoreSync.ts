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
import { ensureFirestoreSafeImageUrl } from '../utils/imageCompression';
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
  IslamicFinancingRequest,
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

export interface CloudWriteResult {
  ok: boolean;
  error?: string;
  writtenCount?: number;
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

async function sanitizeImagesForFirestore(item: Record<string, any>): Promise<Record<string, any>> {
  const copy: Record<string, any> = { ...item };
  const imageKeys = [
    'mainImageUrl',
    'logoUrl',
    'imageUrl',
    'url',
    'thumbnailUrl',
    'desktopImageUrl',
    'mobileImageUrl',
    'heroBannerImageUrl',
    'heroBannerImageMobileUrl',
  ];

  for (const key of imageKeys) {
    if (typeof copy[key] === 'string' && copy[key].startsWith('data:image/')) {
      copy[key] = await ensureFirestoreSafeImageUrl(copy[key], 260_000);
    }
  }

  if (Array.isArray(copy.galleryImageIds) && copy.galleryImageIds.length > 0) {
    copy.galleryImageIds = await Promise.all(
      copy.galleryImageIds.map(async (entry: string) =>
        typeof entry === 'string' && entry.startsWith('data:image/')
          ? (await ensureFirestoreSafeImageUrl(entry, 220_000)) || entry
          : entry
      )
    );
  }

  return copy;
}

async function fetchCollectionList<T>(colName: string): Promise<T[] | null> {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map((d) => d.data() as T);
  } catch {
    return null;
  }
}

async function ensureAuthorizedWriteSession(): Promise<{ ok: boolean; error?: string }> {
  await auth.authStateReady();
  if (auth.currentUser) return { ok: true };
  const anon = await ensureFirebaseAuthSession();
  if (anon) return { ok: true };
  return {
    ok: false,
    error:
      'تم الحفظ محلياً في متصفحك فقط: السحابة تتطلب تسجيل الدخول (Google للسحابة) أو تفعيل Anonymous Auth في Firebase.',
  };
}

export const firestoreSync = {
  /**
   * Pulls all public & operational collections from Cloud Firestore.
   * Requires core public catalog collections to be readable to mark connected=true.
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
        financingRequests,
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
        fetchCollectionList<IslamicFinancingRequest>('financingRequests'),
        fetchCollectionList<TeamMember>('team'),
        fetchCollectionList<PriceHistory>('priceHistory'),
      ]);

      let settings: CatalogSettings | undefined;
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'main'));
        if (settingsSnap.exists()) {
          settings = settingsSnap.data() as CatalogSettings;
        }
      } catch {
        // Ignore single settings failure
      }

      const coreReadsSucceeded = [categories, companies, products, packages].every(
        (arr) => arr !== null
      );

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
      if (financingRequests && financingRequests.length > 0) {
        data.financingRequests = financingRequests.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (teamMembers && teamMembers.length > 0) data.teamMembers = teamMembers;
      if (priceHistory && priceHistory.length > 0) data.priceHistory = priceHistory;
      if (settings) data.settings = settings;

      return {
        connected: coreReadsSucceeded,
        data,
        error: coreReadsSucceeded
          ? undefined
          : 'السحابة تمنع قراءة الكتالوج (403) — يرجى نشر قواعد firestore.rules المحدّثة في Firebase Console.',
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
   * Synchronizes an array of ID-keyed items to Cloud Firestore using byte-aware chunked batches,
   * automatically compressing any oversized inline images so documents never exceed Firestore's 1 MiB limit.
   */
  async syncCollection<T extends { id: string }>(
    colName: string,
    items: T[]
  ): Promise<CloudWriteResult> {
    try {
      const authCheck = await ensureAuthorizedWriteSession();
      if (!authCheck.ok) {
        return { ok: false, error: authCheck.error };
      }

      const targetIds = new Set(items.map((it) => toSafeDocId(it.id)));

      let existingIds: string[] = [];
      try {
        const snap = await getDocs(collection(db, colName));
        existingIds = snap.docs.map((d) => d.id);
      } catch {
        // Proceed with upsert even if listing existing docs failed
      }

      const ops: Array<{ type: 'set' | 'delete'; id: string; payload?: any; bytes: number }> = [];
      for (const item of items) {
        const safeId = toSafeDocId(item.id);
        const sanitized = await sanitizeImagesForFirestore(item as Record<string, any>);
        const payload = stripUndefined(sanitized);
        const bytes = JSON.stringify(payload).length;
        ops.push({
          type: 'set',
          id: safeId,
          payload,
          bytes,
        });
      }
      for (const oldId of existingIds) {
        if (!targetIds.has(oldId)) {
          ops.push({ type: 'delete', id: oldId, bytes: 64 });
        }
      }

      // Commit in safe chunks: <= 40 ops AND <= 3.5MB per Firestore batch commit
      let idx = 0;
      while (idx < ops.length) {
        const batch = writeBatch(db);
        let batchBytes = 0;
        let batchCount = 0;

        while (idx < ops.length && batchCount < 40) {
          const next = ops[idx];
          if (batchCount > 0 && batchBytes + next.bytes > 3_500_000) {
            break;
          }
          const ref = doc(db, colName, next.id);
          if (next.type === 'set') {
            batch.set(ref, next.payload);
          } else {
            batch.delete(ref);
          }
          batchBytes += next.bytes;
          batchCount++;
          idx++;
        }

        await batch.commit();
      }

      return { ok: true, writtenCount: items.length };
    } catch (err: any) {
      const msg = err?.message || String(err || 'خطأ في الحفظ');
      console.warn(`[Firestore Sync] Failed syncing "${colName}":`, msg);
      return {
        ok: false,
        error: `تعذر مزامنة (${colName}) مع Firestore: ${msg}`,
      };
    }
  },

  async saveSettings(settings: CatalogSettings): Promise<CloudWriteResult> {
    try {
      const authCheck = await ensureAuthorizedWriteSession();
      if (!authCheck.ok) return { ok: false, error: authCheck.error };
      const sanitized = await sanitizeImagesForFirestore(settings as Record<string, any>);
      await setDoc(doc(db, 'settings', 'main'), stripUndefined(sanitized));
      return { ok: true };
    } catch (err: any) {
      const msg = err?.message || 'فشل حفظ الإعدادات';
      console.warn('[Firestore Sync] Failed saving settings:', msg);
      return { ok: false, error: msg };
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

  async saveFinancingRequest(request: IslamicFinancingRequest): Promise<boolean> {
    try {
      const safeId = toSafeDocId(request.id || request.requestNumber);
      const sanitizedDocs = await Promise.all(
        (request.uploadedDocs || []).map(async (d) => ({
          ...d,
          imageUrl: (await ensureFirestoreSafeImageUrl(d.imageUrl, 180_000)) || d.imageUrl,
        }))
      );
      await setDoc(
        doc(db, 'financingRequests', safeId),
        stripUndefined({ ...request, uploadedDocs: sanitizedDocs })
      );
      return true;
    } catch (err) {
      console.warn('[Firestore Sync] Failed saving financing request:', err);
      return false;
    }
  },

  async updateOrderStatus(orderNumberOrId: string, status: Order['status']): Promise<boolean> {
    try {
      const authCheck = await ensureAuthorizedWriteSession();
      if (!authCheck.ok) return false;
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
      const authCheck = await ensureAuthorizedWriteSession();
      if (!authCheck.ok) return false;
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
    const authCheck = await ensureAuthorizedWriteSession();
    if (!authCheck.ok) {
      return {
        success: false,
        syncedCollections: 0,
        error: authCheck.error || 'يرجى الضغط على "تسجيل Google للسحابة" أولاً لحفظ ومزامنة البيانات.',
      };
    }

    const tasks: Array<Promise<CloudWriteResult>> = [
      this.syncCollection('categories', snapshot.categories || []),
      this.syncCollection('companies', snapshot.companies || []),
      this.syncCollection('subCategories', snapshot.subCategories || []),
      this.syncCollection('products', snapshot.products || []),
      this.syncCollection('packages', snapshot.packages || []),
      this.syncCollection('advertisements', snapshot.advertisements || []),
      this.syncCollection('images', snapshot.images || []),
      this.syncCollection('pdfDividers', snapshot.pdfDividers || []),
      this.syncCollection('orders', snapshot.orders || []),
      this.syncCollection('financingRequests', snapshot.financingRequests || []),
      this.syncCollection('team', snapshot.teamMembers || []),
      this.syncCollection('priceHistory', snapshot.priceHistory || []),
      this.saveSettings(snapshot.settings),
    ];

    try {
      const results = await Promise.all(tasks);
      const syncedCollections = results.filter((r) => r.ok).length;
      const firstFailed = results.find((r) => !r.ok);
      const lastError = firstFailed?.error
        ? firstFailed.error
        : syncedCollections === 0
          ? 'لم يتم السماح بالكتابة على Firestore — تأكد من نشر firestore.rules أو تسجيل الدخول بحساب Google.'
          : undefined;
      return { success: syncedCollections === tasks.length, syncedCollections, error: lastError };
    } catch (err: any) {
      return {
        success: false,
        syncedCollections: 0,
        error: err?.message || 'فشل المزامنة السحابية',
      };
    }
  },
};
