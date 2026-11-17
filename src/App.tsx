import React, { useState, useEffect } from 'react';
import { PublicCatalogPage } from './pages/PublicCatalogPage';
import { AdminPage } from './pages/AdminPage';
import { OrderDetailsPage } from './components/common/OrderDetailsPage';
import { SharedCatalogView } from './components/catalog/SharedCatalogView';
import { PdfGeneratorView } from './components/admin/PdfGeneratorView';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { canBuildCustomCatalog } from './utils/permissions';
import {
  resolveActiveSalesRep,
  clearStoredSalesRep,
  StoredSalesRep,
} from './utils/salesRepReferral';

import {
  dbStorage,
  DbData,
} from './services/dbStorage';
import { firestoreSync } from './services/firestoreSync';
import { serverSync } from './services/serverSync';
import { auth, signInWithGoogleForCloudSync } from './services/firebase';
import {
  INITIAL_COMPANIES,
  INITIAL_PRODUCTS,
  INITIAL_PACKAGES,
} from './data/seedData';

import {
  Product,
  Package,
  Category,
  Company,
  CompanySubCategory,
  CompanyImage,
  Advertisement,
  Order,
  PriceHistory,
  CatalogSettings,
  AuditLog,
  TeamMember,
  SharedCustomCatalog,
  IslamicFinancingRequest,
} from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'catalog' | 'admin' | 'catalog_builder'>('catalog');
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(() => {
    const activeUser = dbStorage.getCurrentUser();
    if (!activeUser) {
      dbStorage.setCurrentUserId(null);
    }
    return activeUser;
  });
  const isAdminLoggedIn = Boolean(currentUser);

  // App Central State
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [subCategories, setSubCategories] = useState<CompanySubCategory[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [images, setImages] = useState<CompanyImage[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [financingRequests, setFinancingRequests] = useState<IslamicFinancingRequest[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [settings, setSettings] = useState<CatalogSettings>({
    title: 'CROPSA - كروپسا للحلول والمخصبات الزراعية',
    subtitle: 'الكتالوج الديناميكي الرقمي المعتمد للمخصبات والأسمدة الزراعية مع تحديث الأسعار الفوري',
    phone: '01000000000',
    whatsApp: '201000000000',
    email: 'info@cropsa-agri.com',
    website: 'www.cropsa-agri.com',
    footerText: 'جميع الحقوق محفوظة © شركة كروپسا للحلول والمخصبات الزراعية 2026',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://cropsa-agri.com',
    primaryColor: '#5A5A40',
    productsPerPage: 4,
    showPricesInPdf: true,
    showProductIds: true,
    showWholesaleNotice: true,
    wholesaleNoticeTitle: 'تنبيه الأسعار والخصومات التجارية',
    wholesaleNoticeContent:
      'الأسعار المعروضة بالكتالوج هي الأسعار التجارية المعتمدة الخاصة بالموزعين والتجار والمزارع الكبرى، وهي أسعار مبدئية قبل احتساب خصومات الكميات وعروض السداد. بعد إرسال طلبيتك، سيتم التواصل معك مباشرة من إدارة البيع التجاري لتحديد الخصم التجاري الخاص بكم وتأكيد الفاتورة النهائية.',
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);
  const [sharedCatalog, setSharedCatalog] = useState<SharedCustomCatalog | null>(null);
  const [builderToasts, setBuilderToasts] = useState<ToastMessage[]>([]);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | undefined>(undefined);
  const [cloudError, setCloudError] = useState<string | undefined>(undefined);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState<boolean>(() =>
    dbStorage.hasPendingCloudSync()
  );

  // Active Sales Rep attribution (from URL ?rep=username or localStorage)
  const [activeSalesRep, setActiveSalesRep] = useState<StoredSalesRep | null>(() => {
    return resolveActiveSalesRep();
  });

  // Re-resolve active sales rep whenever teamMembers are loaded/updated from DB or Cloud
  useEffect(() => {
    const resolved = resolveActiveSalesRep(teamMembers);
    if (resolved) {
      setActiveSalesRep(resolved);
    }
  }, [teamMembers]);

  const handleClearActiveSalesRep = () => {
    clearStoredSalesRep();
    setActiveSalesRep(null);
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('rep');
      url.searchParams.delete('salesRep');
      url.searchParams.delete('agent');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const addBuilderToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setBuilderToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setBuilderToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Initialize DB Data & Check URL Deep Links (?order=... or ?catalog=...)
  useEffect(() => {
    const data: DbData = dbStorage.getData();
    setProducts(data.products || []);
    setPackages(data.packages || []);
    setCategories(data.categories || []);
    setCompanies(data.companies || []);
    setSubCategories(data.subCategories || []);
    setTeamMembers(data.teamMembers || []);
    setImages(data.images || []);
    setAdvertisements(data.advertisements || []);
    const localOrders = data.orders || [];
    setOrders(localOrders);
    setFinancingRequests(data.financingRequests || []);
    setPriceHistory(data.priceHistory || []);
    setAuditLogs(data.auditLogs || []);
    if (data.settings) setSettings(data.settings);

    const params = new URLSearchParams(window.location.search);

    // 1. Check if employee opened a direct order link (?order=CR-...)
    const orderParam = params.get('order') || params.get('orderId');
    if (orderParam) {
      const localMatch = localOrders.find(
        (o) => o.orderNumber === orderParam || o.id === orderParam
      );
      if (localMatch) {
        setInspectedOrder(localMatch);
      } else {
        Promise.allSettled([
          firestoreSync.fetchOrderFromCloud(orderParam),
          fetch(`/api/orders/${encodeURIComponent(orderParam)}`)
            .then((r) => r.json())
            .then((res) => (res.success && res.order ? (res.order as Order) : null)),
        ]).then((results) => {
          for (const res of results) {
            if (res.status === 'fulfilled' && res.value) {
              setInspectedOrder(res.value);
              break;
            }
          }
        });
      }
    }

    // 2. Check if customer/employee opened a shared custom catalog link (?catalog=CAT-...)
    const catalogParam = params.get('catalog') || params.get('c');
    if (catalogParam) {
      const localCat = dbStorage.getSharedCatalogById(catalogParam);
      if (localCat) {
        setSharedCatalog(localCat);
      } else {
        Promise.allSettled([
          firestoreSync.fetchSharedCatalog(catalogParam),
          fetch(`/api/custom-catalogs/${encodeURIComponent(catalogParam)}`)
            .then((r) => r.json())
            .then((res) => (res.success && res.catalog ? (res.catalog as SharedCustomCatalog) : null)),
        ]).then((results) => {
          for (const res of results) {
            if (res.status === 'fulfilled' && res.value) {
              setSharedCatalog(res.value);
              dbStorage.saveSharedCatalog(res.value);
              break;
            }
          }
        });
      }
    }

    // 2.5 Hydrate from high-capacity IndexedDB if it holds saved collections
    let idbHydratedPromise = dbStorage
      .loadFromIndexedDb()
      .then((idbData) => {
        if (idbData.categories?.length) setCategories(idbData.categories);
        if (idbData.companies?.length) {
          const repaired = idbData.companies.map((c) => {
            if (!c.logoUrl || c.logoUrl === '') {
              const init = INITIAL_COMPANIES.find((ic) => ic.id === c.id);
              if (init?.logoUrl) return { ...c, logoUrl: init.logoUrl };
            }
            return c;
          });
          setCompanies(repaired);
          dbStorage.saveCompanies(repaired);
        } else {
          setCompanies(INITIAL_COMPANIES);
          dbStorage.saveCompanies(INITIAL_COMPANIES);
        }
        if (idbData.subCategories?.length) setSubCategories(idbData.subCategories);
        if (idbData.products?.length && idbData.products.length >= INITIAL_PRODUCTS.length) {
          setProducts(idbData.products);
        } else {
          setProducts(INITIAL_PRODUCTS);
          dbStorage.saveProducts(INITIAL_PRODUCTS);
        }
        if (idbData.packages?.length && idbData.packages.length >= INITIAL_PACKAGES.length) {
          setPackages(idbData.packages);
        } else {
          setPackages(INITIAL_PACKAGES);
          dbStorage.savePackages(INITIAL_PACKAGES);
        }
        if (idbData.advertisements?.length) setAdvertisements(idbData.advertisements);
        if (idbData.images?.length) setImages(idbData.images);
        if (idbData.orders?.length) setOrders(idbData.orders);
        if (idbData.financingRequests?.length) setFinancingRequests(idbData.financingRequests);
        if (idbData.teamMembers?.length) setTeamMembers(idbData.teamMembers);
        if (idbData.priceHistory?.length) setPriceHistory(idbData.priceHistory);
        if (idbData.settings) setSettings(idbData.settings);
        return idbData;
      })
      .catch(() => ({}));

    // 3. Centralized Dual Hydration (Firestore Single-Doc Snapshot + Central Server Storage)
    void Promise.all([
      idbHydratedPromise,
      firestoreSync.pullSingleDocumentSnapshot(),
      serverSync.fetchFromCentralServer(),
    ])
      .then(([idbData, firestoreSnapRes, serverRes]) => {
        const localProducts =
          (idbData as any)?.products?.length >= INITIAL_PRODUCTS.length
            ? (idbData as any).products
            : INITIAL_PRODUCTS;

        // Determine best remote dataset
        const firestoreProds =
          firestoreSnapRes.success && firestoreSnapRes.data?.products
            ? firestoreSnapRes.data.products
            : [];
        const serverProds =
          serverRes.success && serverRes.data?.products ? serverRes.data.products : [];

        const bestRemoteProds =
          firestoreProds.length >= serverProds.length ? firestoreProds : serverProds;
        const bestRemoteData =
          firestoreProds.length >= serverProds.length ? firestoreSnapRes.data : serverRes.data;

        // Case A: Local device has MORE products than remote AND has at least the baseline count!
        // Immediately broadcast local catalog to central server and cloud snapshot!
        if (
          localProducts.length > bestRemoteProds.length &&
          localProducts.length >= INITIAL_PRODUCTS.length
        ) {
          const fullData = {
            ...dbStorage.getData(),
            products: localProducts,
            pdfDividers: dbStorage.getPdfDividers(),
          };
          void Promise.allSettled([
            serverSync.syncToCentralServer(fullData),
            firestoreSync.pushSingleDocumentSnapshot(fullData),
          ]).then(() => {
            dbStorage.setPendingCloudSync(false);
            setHasUnsyncedChanges(false);
            setLastCloudSyncAt(new Date().toISOString());
            setCloudConnected(true);
          });
          return;
        }

        // Case B: Remote has equal or MORE products (and at least the baseline count)!
        // Hydrate local device immediately!
        if (
          bestRemoteData &&
          bestRemoteProds.length >= localProducts.length &&
          bestRemoteProds.length >= INITIAL_PRODUCTS.length
        ) {
          const rd = bestRemoteData;
          if (rd.categories?.length) {
            setCategories(rd.categories);
            dbStorage.saveCategories(rd.categories);
          }
          if (rd.companies?.length) {
            const repairedCompanies = rd.companies.map((c: Company) => {
              if (!c.logoUrl || c.logoUrl === '') {
                const init = INITIAL_COMPANIES.find((ic) => ic.id === c.id);
                if (init?.logoUrl) return { ...c, logoUrl: init.logoUrl };
              }
              return c;
            });
            setCompanies(repairedCompanies);
            dbStorage.saveCompanies(repairedCompanies);
          }
          if (rd.subCategories?.length) {
            setSubCategories(rd.subCategories);
            dbStorage.saveSubCategories(rd.subCategories);
          }
          if (rd.products?.length) {
            setProducts(rd.products);
            dbStorage.saveProducts(rd.products);
          }
          if (rd.packages?.length) {
            setPackages(rd.packages);
            dbStorage.savePackages(rd.packages);
          }
          if (rd.advertisements?.length) {
            setAdvertisements(rd.advertisements);
            dbStorage.saveAdvertisements(rd.advertisements);
          }
          if (rd.images?.length) {
            setImages(rd.images);
            dbStorage.saveImages(rd.images);
          }
          if (rd.pdfDividers?.length) {
            dbStorage.savePdfDividers(rd.pdfDividers);
          }
          if (rd.settings) {
            setSettings(rd.settings);
            dbStorage.saveSettings(rd.settings);
          }
          setCloudConnected(true);
          setLastCloudSyncAt(new Date().toISOString());
        }
      })
      .catch(() => {});
  }, []);

  // Automatic silent continuous background synchronization ("يعمل كدا لوحده دايما")
  useEffect(() => {
    let debounceTimer: any = null;

    const performSilentAutoSync = async () => {
      const fullData = dbStorage.getData();
      const currentProds = fullData.products || [];
      // Safety guard: only push if this device has at least the baseline product count
      if (currentProds.length < INITIAL_PRODUCTS.length) return;

      const payload = {
        ...fullData,
        products: currentProds,
        pdfDividers: dbStorage.getPdfDividers(),
      };

      try {
        await Promise.allSettled([
          serverSync.syncToCentralServer(payload),
          firestoreSync.pushSingleDocumentSnapshot(payload),
        ]);
        dbStorage.setPendingCloudSync(false);
        setHasUnsyncedChanges(false);
        setLastCloudSyncAt(new Date().toISOString());
        setCloudConnected(true);
      } catch (e) {
        console.warn('[Auto-Sync] Silent sync background catch:', e);
      }
    };

    const handleCatalogUpdated = () => {
      setHasUnsyncedChanges(true);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void performSilentAutoSync();
      }, 1500);
    };

    window.addEventListener('cropsa:catalog-updated', handleCatalogUpdated);
    window.addEventListener('online', performSilentAutoSync);

    // Initial check if there were pending changes left from before refresh
    if (dbStorage.hasPendingCloudSync()) {
      debounceTimer = setTimeout(() => {
        void performSilentAutoSync();
      }, 2000);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('cropsa:catalog-updated', handleCatalogUpdated);
      window.removeEventListener('online', performSilentAutoSync);
    };
  }, []);

  // Live cross-browser session sync: updates even if a user has an active tab open right now
  useEffect(() => {
    let lastKnownSyncTime = '';

    const checkServerUpdates = async () => {
      if (dbStorage.hasPendingCloudSync()) return;

      // Fetch latest updates from central server or single-doc firestore snapshot
      const [serverRes, firestoreSnapRes] = await Promise.allSettled([
        serverSync.fetchFromCentralServer(),
        firestoreSync.pullSingleDocumentSnapshot(),
      ]);

      const sData =
        serverRes.status === 'fulfilled' && serverRes.value.success && serverRes.value.data
          ? serverRes.value.data
          : null;
      const fData =
        firestoreSnapRes.status === 'fulfilled' &&
        firestoreSnapRes.value.success &&
        firestoreSnapRes.value.data
          ? firestoreSnapRes.value.data
          : null;

      const sCount = sData?.products?.length || 0;
      const fCount = fData?.products?.length || 0;
      const bestRemote = sCount >= fCount ? sData : fData;
      if (!bestRemote || !bestRemote.products?.length) return;

      const incomingProds = bestRemote.products;
      const syncStamp =
        (bestRemote as any).lastSyncedAt || (bestRemote as any).syncedAt || '';

      setProducts((prev) => {
        // Build map of current local products
        const localList = prev.length >= dbStorage.getProducts().length ? prev : dbStorage.getProducts();
        const localMap = new Map(localList.map((p) => [p.id, p]));
        let hasLocalEditsToPush = false;
        let hasChanges = false;

        const merged: Product[] = incomingProds.map((remoteP) => {
          const localP = localMap.get(remoteP.id);
          if (!localP) {
            hasChanges = true;
            return remoteP;
          }
          localMap.delete(remoteP.id);

          const localTime = localP.updatedAt ? new Date(localP.updatedAt).getTime() : 0;
          const remoteTime = remoteP.updatedAt ? new Date(remoteP.updatedAt).getTime() : 0;

          // If local version was edited more recently, NEVER overwrite it!
          if (localTime > remoteTime) {
            hasLocalEditsToPush = true;
            return localP;
          }

          // Preserve local imageRotation if remote does not have it yet
          if (localP.imageRotation !== undefined && remoteP.imageRotation === undefined) {
            hasLocalEditsToPush = true;
            return { ...remoteP, imageRotation: localP.imageRotation };
          }

          // If remote is strictly newer, accept remote changes
          if (remoteTime > localTime) {
            hasChanges = true;
            return remoteP;
          }

          // If timestamps are identical, preserve local product properties to prevent UI jitter
          return localP;
        });

        // Any local products that are not present on remote at all must be preserved
        for (const remaining of localMap.values()) {
          merged.push(remaining);
          hasLocalEditsToPush = true;
          hasChanges = true;
        }

        if (hasLocalEditsToPush) {
          const payload = {
            ...dbStorage.getData(),
            products: merged,
            pdfDividers: dbStorage.getPdfDividers(),
          };
          void Promise.allSettled([
            serverSync.syncToCentralServer(payload),
            firestoreSync.pushSingleDocumentSnapshot(payload),
          ]);
        }

        if (hasChanges || merged.length !== prev.length) {
          dbStorage.saveProducts(merged);
          return merged;
        }

        return prev;
      });

      if (bestRemote.companies?.length) {
        setCompanies(bestRemote.companies);
        dbStorage.saveCompanies(bestRemote.companies);
      }
      if (bestRemote.categories?.length) {
        setCategories(bestRemote.categories);
        dbStorage.saveCategories(bestRemote.categories);
      }
      if (bestRemote.subCategories?.length) {
        setSubCategories(bestRemote.subCategories);
        dbStorage.saveSubCategories(bestRemote.subCategories);
      }
      if (bestRemote.packages?.length) {
        setPackages(bestRemote.packages);
        dbStorage.savePackages(bestRemote.packages);
      }
      if (bestRemote.advertisements?.length) {
        setAdvertisements(bestRemote.advertisements);
        dbStorage.saveAdvertisements(bestRemote.advertisements);
      }
      if (bestRemote.images?.length) {
        setImages(bestRemote.images);
        dbStorage.saveImages(bestRemote.images);
      }
      if (bestRemote.settings) {
        setSettings(bestRemote.settings);
        dbStorage.saveSettings(bestRemote.settings);
      }
    };

    const interval = setInterval(checkServerUpdates, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkServerUpdates();
      }
    };
    const onFocus = () => {
      void checkServerUpdates();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const trackCloudWrite = async (promise: Promise<{ ok: boolean; error?: string }>) => {
    const res = await promise;
    if (res.ok) {
      setCloudConnected(true);
      setCloudError(undefined);
      setLastCloudSyncAt(new Date().toISOString());
      dbStorage.setPendingCloudSync(false);
      setHasUnsyncedChanges(false);
    } else {
      dbStorage.setPendingCloudSync(true);
      setHasUnsyncedChanges(true);
      if (res.error) {
        console.warn('[Cloud Auto-Sync Warning]:', res.error);
        setCloudError(res.error);
      }
    }
  };

  // Save Handlers with IndexedDB + localStorage Persistence & Live Cloud Firestore Tracking
  const handleSaveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    dbStorage.saveProducts(updatedProducts);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    dbStorage.addAuditLog('تحديث المنتجات', 'Product', 'تم حفظ تعديلات قائمة المنتجات');
    void trackCloudWrite(firestoreSync.syncCollection('products', updatedProducts));
    void serverSync.syncToCentralServer({ products: updatedProducts });
    void firestoreSync.pushSingleDocumentSnapshot({
      ...dbStorage.getData(),
      products: updatedProducts,
    });
  };

  const handleSaveSubCategories = (updatedSubs: CompanySubCategory[]) => {
    setSubCategories(updatedSubs);
    dbStorage.saveSubCategories(updatedSubs);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    dbStorage.addAuditLog('تحديث الأقسام الفرعية', 'SubCategory', 'تم حفظ تعديلات أقسام الشركات الفرعية');
    void trackCloudWrite(firestoreSync.syncCollection('subCategories', updatedSubs));
    void serverSync.syncToCentralServer({ subCategories: updatedSubs });
  };

  const handleSaveTeamMembers = (updatedTeam: TeamMember[]) => {
    setTeamMembers(updatedTeam);
    dbStorage.saveTeamMembers(updatedTeam);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    void trackCloudWrite(firestoreSync.syncCollection('team', updatedTeam));
    void serverSync.syncToCentralServer({ teamMembers: updatedTeam });
    if (currentUser) {
      const updatedSelf = updatedTeam.find((m) => m.id === currentUser.id);
      if (!updatedSelf || !updatedSelf.active) {
        dbStorage.setCurrentUserId(null);
        setCurrentUser(null);
        setCurrentView('catalog');
      } else {
        setCurrentUser(updatedSelf);
      }
    }
    dbStorage.addAuditLog('تحديث فريق العمل', 'Team', 'تم تحديث حسابات وصلاحيات فريق العمل');
  };

  const handleSavePackages = (updatedPackages: Package[]) => {
    setPackages(updatedPackages);
    dbStorage.savePackages(updatedPackages);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    void trackCloudWrite(firestoreSync.syncCollection('packages', updatedPackages));
    void serverSync.syncToCentralServer({ packages: updatedPackages });
  };

  const handleSaveCategories = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    dbStorage.saveCategories(updatedCategories);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    dbStorage.addAuditLog('تحديث الأقسام', 'Category', 'تم حفظ تعديلات الأقسام الرئيسية والفرعية');
    void trackCloudWrite(firestoreSync.syncCollection('categories', updatedCategories));
    void serverSync.syncToCentralServer({ categories: updatedCategories });
  };

  const handleSaveCompanies = (updatedCompanies: Company[]) => {
    setCompanies(updatedCompanies);
    dbStorage.saveCompanies(updatedCompanies);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    dbStorage.addAuditLog('تحديث الشركات', 'Company', 'تم حفظ تعديلات أسماء ومعلومات الشركات المصنعة');
    void trackCloudWrite(firestoreSync.syncCollection('companies', updatedCompanies));
    void serverSync.syncToCentralServer({ companies: updatedCompanies });
  };

  const handleSaveImages = (updatedImages: CompanyImage[]) => {
    setImages(updatedImages);
    dbStorage.saveImages(updatedImages);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    void trackCloudWrite(firestoreSync.syncCollection('images', updatedImages));
    void serverSync.syncToCentralServer({ images: updatedImages });
  };

  const handleSaveAdvertisements = (updatedAds: Advertisement[]) => {
    setAdvertisements(updatedAds);
    dbStorage.saveAdvertisements(updatedAds);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    void trackCloudWrite(firestoreSync.syncCollection('advertisements', updatedAds));
    void serverSync.syncToCentralServer({ advertisements: updatedAds });
  };

  const handleSaveSettings = (updatedSettings: CatalogSettings) => {
    setSettings(updatedSettings);
    dbStorage.saveSettings(updatedSettings);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    void trackCloudWrite(firestoreSync.saveSettings(updatedSettings));
    void serverSync.syncToCentralServer({ settings: updatedSettings });
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    setOrders(updated);
    dbStorage.saveOrders(updated);
    void firestoreSync.updateOrderStatus(orderId, status);
  };

  const handleSaveFinancingRequests = (updatedRequests: IslamicFinancingRequest[]) => {
    setFinancingRequests(updatedRequests);
    dbStorage.saveFinancingRequests(updatedRequests);
    dbStorage.setPendingCloudSync(true);
    setHasUnsyncedChanges(true);
    void trackCloudWrite(firestoreSync.syncCollection('financingRequests', updatedRequests));
  };

  const handleSubmitFinancingRequest = async (
    payload: Omit<IslamicFinancingRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<IslamicFinancingRequest> => {
    const now = new Date().toISOString();
    const newReq: IslamicFinancingRequest = {
      ...payload,
      id: 'FIN-' + Date.now(),
      requestNumber: 'FIN-' + Math.floor(100000 + Math.random() * 900000),
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newReq, ...financingRequests];
    setFinancingRequests(updated);
    dbStorage.saveFinancingRequests(updated);
    dbStorage.addAuditLog(
      'طلب تمويل إسلامي جديد',
      'Order',
      `طلب تمويل رقم ${newReq.requestNumber} باسم ${newReq.applicantName} بمبلغ ${newReq.requestedAmount} ج.م`
    );
    void firestoreSync.saveFinancingRequest(newReq);
    return newReq;
  };

  const handleBatchUpdatePrices = (
    updates: { productId: string; packageId: string; newPrice: number }[],
    source: 'manual' | 'excel',
    updatedBy: string
  ) => {
    const result = dbStorage.batchUpdatePrices(updates, source, updatedBy);
    const refreshed: DbData = dbStorage.getData();
    setPackages(refreshed.packages);
    setPriceHistory(refreshed.priceHistory);
    void firestoreSync.syncCollection('packages', refreshed.packages);
    void firestoreSync.syncCollection('priceHistory', refreshed.priceHistory);
    return result;
  };

  const handleAddPriceHistory = (entry: Omit<PriceHistory, 'id' | 'createdAt'>) => {
    dbStorage.addPriceHistory(entry);
    const updatedHistory = dbStorage.getData().priceHistory;
    setPriceHistory(updatedHistory);
    void firestoreSync.syncCollection('priceHistory', updatedHistory);
  };

  const handleSyncToCloud = async () => {
    setIsCloudSyncing(true);
    setCloudError(undefined);
    try {
      const fullPayload = {
        ...dbStorage.getData(),
        products,
        packages,
        categories,
        companies,
        subCategories,
        images,
        advertisements,
        orders,
        financingRequests,
        teamMembers,
        priceHistory,
        settings,
        pdfDividers: dbStorage.getPdfDividers(),
      };

      // 1. Push to centralized server storage immediately (for all browsers)
      const serverResult = await serverSync.syncToCentralServer(fullPayload);

      // 2. Push high-speed unified single-doc snapshot to Cloud Firestore (zero Google auth blocker)
      const singleDocRes = await firestoreSync.pushSingleDocumentSnapshot(fullPayload);

      // 3. Attempt multi-doc collection push in background if authenticated
      void firestoreSync.pushFullSnapshot(fullPayload).catch(() => {});

      if (singleDocRes.success || serverResult.success) {
        setCloudConnected(true);
        setLastCloudSyncAt(new Date().toISOString());
        dbStorage.setPendingCloudSync(false);
        setHasUnsyncedChanges(false);
        addBuilderToast(
          `تم رفع ومزامنة الكتالوج بالكامل (${products.length} منتج) لجميع الأجهزة والزوار بنجاح ✓`,
          'success'
        );
      } else {
        const errMsg = singleDocRes.error || serverResult.error || 'تعذر المزامنة مع السحابة';
        setCloudError(errMsg);
        addBuilderToast(errMsg, 'error');
      }
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleConnectGoogleCloud = async () => {
    try {
      await signInWithGoogleForCloudSync();
      await handleSyncToCloud();
    } catch (err: any) {
      setCloudError(err?.message || 'تعذر تسجيل الدخول عبر Google');
    }
  };

  const handleAddImportLog = (log: any) => {
    dbStorage.addImportLog(log);
  };

  const handleSubmitOrder = async (customerData: any): Promise<Order> => {
    const items = Array.isArray(customerData.items) ? customerData.items : [];
    const totalItems = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
    const calculatedTotal = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
    const totalAmount =
      typeof customerData.totalAmount === 'number' && !isNaN(customerData.totalAmount)
        ? customerData.totalAmount
        : calculatedTotal;

    const newOrder: Order = {
      id: 'ORD-' + Date.now(),
      orderNumber: 'CR-' + Math.floor(100000 + Math.random() * 900000),
      customerName: customerData.customerName || 'عميل كروپسا',
      companyName: customerData.companyName || '',
      phone: customerData.phone || '',
      governorate: customerData.governorate || 'البحيرة',
      city: customerData.city || '',
      addressDetails: customerData.addressDetails || '',
      paymentMethod: customerData.paymentMethod || 'cash',
      installmentDetails: customerData.installmentDetails,
      shippingAddress: customerData.shippingAddress,
      salesRepId: customerData.salesRepId || activeSalesRep?.id,
      salesRepName: customerData.salesRepName || activeSalesRep?.name,
      salesRepUsername: customerData.salesRepUsername || activeSalesRep?.username,
      salesRepPhone: customerData.salesRepPhone || activeSalesRep?.phone,
      referralSource: customerData.referralSource || (activeSalesRep ? 'rep_link' : 'direct'),
      items,
      totalItems,
      totalAmount: totalAmount || 0,
      status: 'new',
      notes: customerData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    dbStorage.saveOrders(updated);
    dbStorage.addAuditLog(
      'إرسال طلبية عميل جديدة',
      'Order',
      `طلب جديد بقيمة ${newOrder.totalAmount} جنيه باسم ${newOrder.customerName} (${newOrder.paymentMethod === 'installment' ? 'تقسيط' : 'كاش'})`
    );

    // Sync order to Cloud Firestore & backend webhook/store
    void firestoreSync.saveOrder(newOrder);
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: newOrder,
          webhookUrl: settings.orderWebhookUrl,
          origin: window.location.origin,
        }),
      });
    } catch (e) {
      console.warn('Backend order sync warning:', e);
    }

    return newOrder;
  };

  const handleDetailedLogin = (
    userOrEmail: string,
    pass: string
  ): { success: boolean; user?: TeamMember; error?: string } => {
    const res = dbStorage.authenticateWithReason(userOrEmail, pass);
    if (res.user) {
      dbStorage.setCurrentUserId(res.user.id);
      setCurrentUser(res.user);
      setTeamMembers(dbStorage.getTeamMembers());
      dbStorage.addAuditLog(
        'تسجيل دخول الموظف',
        'Auth',
        `تسجيل دخول ناجح للموظف: ${res.user.name} (@${res.user.username} - ${res.user.role})`
      );
      return { success: true, user: res.user };
    }
    return { success: false, error: res.error || 'بيانات الدخول غير صحيحة.' };
  };

  const handleLogin = (userOrEmail: string, pass: string) => {
    return handleDetailedLogin(userOrEmail, pass).success;
  };

  const handleLogout = () => {
    dbStorage.setCurrentUserId(null);
    setCurrentUser(null);
    setCurrentView('catalog');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans antialiased text-stone-900">
      {inspectedOrder ? (
        <OrderDetailsPage
          order={inspectedOrder}
          currentUser={currentUser}
          onLogin={handleDetailedLogin}
          onLogout={handleLogout}
          onUpdateStatus={(orderNumber, status) => {
            const updated = orders.map((o) =>
              o.orderNumber === orderNumber || o.id === orderNumber
                ? { ...o, status }
                : o
            );
            setOrders(updated);
            dbStorage.saveOrders(updated);
            setInspectedOrder((prev) => (prev ? { ...prev, status } : null));
          }}
          onBackToCatalog={() => {
            setInspectedOrder(null);
            window.history.replaceState({}, '', window.location.pathname);
          }}
          onOpenAdmin={() => {
            setInspectedOrder(null);
            window.history.replaceState({}, '', window.location.pathname);
            setCurrentView('admin');
          }}
        />
      ) : sharedCatalog ? (
        <SharedCatalogView
          catalog={sharedCatalog}
          currentUser={currentUser}
          onSubmitOrder={handleSubmitOrder}
          onOpenFullStore={() => {
            setSharedCatalog(null);
            window.history.replaceState({}, '', window.location.pathname);
            setCurrentView('catalog');
          }}
        />
      ) : currentView === 'catalog_builder' && canBuildCustomCatalog(currentUser) ? (
        <div className="min-h-screen bg-[#F7F8FA] p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <PdfGeneratorView
              products={products}
              packages={packages}
              categories={categories}
              companies={companies}
              settings={settings}
              advertisements={advertisements}
              onShowToast={addBuilderToast}
              currentUser={currentUser}
              onBackToCatalog={() => setCurrentView('catalog')}
            />
          </div>
          <ToastContainer
            toasts={builderToasts}
            onDismiss={(id) => setBuilderToasts((prev) => prev.filter((t) => t.id !== id))}
          />
        </div>
      ) : currentView === 'catalog' ? (
        <PublicCatalogPage
          products={products}
          packages={packages}
          categories={categories}
          companies={companies}
          subCategories={subCategories}
          advertisements={advertisements}
          settings={settings}
          onOpenAdmin={() => setCurrentView('admin')}
          onOpenCatalogBuilder={() => setCurrentView('catalog_builder')}
          isAdminLoggedIn={isAdminLoggedIn}
          currentUser={currentUser}
          activeSalesRep={activeSalesRep}
          onClearActiveSalesRep={handleClearActiveSalesRep}
          teamMembers={teamMembers}
          onEmployeeLogin={handleDetailedLogin}
          onLogout={handleLogout}
          onSubmitOrder={handleSubmitOrder}
          onSubmitFinancingRequest={handleSubmitFinancingRequest}
        />
      ) : (
        <AdminPage
          products={products}
          packages={packages}
          categories={categories}
          companies={companies}
          subCategories={subCategories}
          images={images}
          advertisements={advertisements}
          orders={orders}
          financingRequests={financingRequests}
          teamMembers={teamMembers}
          currentUser={currentUser}
          priceHistory={priceHistory}
          settings={settings}
          auditLogs={auditLogs}
          onSaveProducts={handleSaveProducts}
          onSavePackages={handleSavePackages}
          onSaveCategories={handleSaveCategories}
          onSaveCompanies={handleSaveCompanies}
          onSaveSubCategories={handleSaveSubCategories}
          onSaveImages={handleSaveImages}
          onSaveAdvertisements={handleSaveAdvertisements}
          onSaveSettings={handleSaveSettings}
          onSaveTeamMembers={handleSaveTeamMembers}
          onSaveFinancingRequests={handleSaveFinancingRequests}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onBatchUpdatePrices={handleBatchUpdatePrices}
          onAddPriceHistory={handleAddPriceHistory}
          onAddImportLog={handleAddImportLog}
          onBackToCatalog={() => setCurrentView('catalog')}
          isAdminLoggedIn={isAdminLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          cloudConnected={cloudConnected}
          hasUnsyncedChanges={hasUnsyncedChanges}
          isCloudSyncing={isCloudSyncing}
          lastCloudSyncAt={lastCloudSyncAt}
          cloudError={cloudError}
          onSyncToCloud={handleSyncToCloud}
          onConnectGoogleCloud={handleConnectGoogleCloud}
        />
      )}
      {currentView === 'admin' && (
        <ToastContainer
          toasts={builderToasts}
          onDismiss={(id) => setBuilderToasts((prev) => prev.filter((t) => t.id !== id))}
        />
      )}
    </div>
  );
}
