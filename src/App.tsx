import React, { useState, useEffect } from 'react';
import { PublicCatalogPage } from './pages/PublicCatalogPage';
import { AdminPage } from './pages/AdminPage';
import { OrderDetailsPage } from './components/common/OrderDetailsPage';
import { SharedCatalogView } from './components/catalog/SharedCatalogView';
import { PdfGeneratorView } from './components/admin/PdfGeneratorView';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { canBuildCustomCatalog } from './utils/permissions';
import {
  resolveActiveSalesRep,
  clearStoredSalesRep,
  StoredSalesRep,
} from './utils/salesRepReferral';
import { parseCurrentRoute, navigateTo } from './utils/urlRouter';

import {
  dbStorage,
  DbData,
} from './services/dbStorage';
import { firestoreSync } from './services/firestoreSync';
import { serverSync } from './services/serverSync';
import { supabase } from './services/supabase';
import { supabaseSync } from './services/supabaseSync';
import { auth, signInWithGoogleForCloudSync } from './services/firebase';
import {
  INITIAL_COMPANIES,
  INITIAL_PRODUCTS,
  INITIAL_PACKAGES,
  INITIAL_CATEGORIES,
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
  const [currentView, setCurrentView] = useState<'catalog' | 'admin' | 'catalog_builder'>(() => {
    const init = parseCurrentRoute();
    if (init.type === 'admin') return 'admin';
    if (init.type === 'builder') return 'catalog_builder';
    return 'catalog';
  });
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

  const applyRemoteCatalogData = (rd: any) => {
    if (!rd || !Array.isArray(rd.products) || rd.products.length < INITIAL_PRODUCTS.length) return;

    const cleanProducts = rd.products.map((p: any) => {
      if (p.subCategoryId && p.categoryId) {
        const sub = (rd.categories || INITIAL_CATEGORIES).find((c: any) => c.id === p.subCategoryId);
        if (sub?.parentId && sub.parentId !== p.categoryId) {
          const { subCategoryId, ...rest } = p;
          return rest;
        }
      }
      return p;
    });

    setProducts(cleanProducts);
    dbStorage.saveProducts(cleanProducts);

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
    if (rd.orders?.length) {
      setOrders(rd.orders);
      dbStorage.saveOrders(rd.orders);
    }
    if (rd.financingRequests?.length) {
      setFinancingRequests(rd.financingRequests);
      dbStorage.saveFinancingRequests(rd.financingRequests);
    }
    if (rd.teamMembers?.length) {
      setTeamMembers(rd.teamMembers);
      dbStorage.saveTeamMembers(rd.teamMembers);
    }
    if (rd.priceHistory?.length) {
      setPriceHistory(rd.priceHistory);
      dbStorage.savePriceHistory(rd.priceHistory);
    }
    if (rd.settings) {
      setSettings(rd.settings);
      dbStorage.saveSettings(rd.settings);
    }
    setCloudConnected(true);
    setLastCloudSyncAt(new Date().toISOString());
    dbStorage.setPendingCloudSync(false);
    setHasUnsyncedChanges(false);
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

    const currentRoute = parseCurrentRoute();

    // 1. Check if employee opened a direct order link (/order/CR-... or ?order=CR-...)
    if (currentRoute.type === 'order') {
      const orderParam = currentRoute.orderId;
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

    // 2. Check if customer/employee opened a shared custom catalog link (/shared/... or ?catalog=CAT-...)
    if (currentRoute.type === 'shared_catalog') {
      const catalogParam = currentRoute.catalogId;
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
        const rawIdbProducts = idbData.products || [];
        const idbProducts = rawIdbProducts.map((p: any) => {
          if (p.subCategoryId && p.categoryId) {
            const sub = (idbData.categories || INITIAL_CATEGORIES).find((c: any) => c.id === p.subCategoryId);
            if (sub?.parentId && sub.parentId !== p.categoryId) {
              const { subCategoryId, ...rest } = p;
              return rest;
            }
          }
          return p;
        });
        const idbStimCount = idbProducts.filter((p: any) => p.categoryId === 'CAT-01').length;
        const initialStimCount = INITIAL_PRODUCTS.filter((p: any) => p.categoryId === 'CAT-01').length;

        if (idbProducts.length >= INITIAL_PRODUCTS.length && idbStimCount >= initialStimCount) {
          setProducts(idbProducts);
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

    // 2.7 Fast Path: Immediate Supabase Snapshot Hydration (< 150ms)
    void supabaseSync.pullSingleDocumentSnapshot().then((res) => {
      if (res.success && res.data?.products?.length >= INITIAL_PRODUCTS.length) {
        applyRemoteCatalogData(res.data);
      }
    });

    // 3. Centralized Multi-Cloud Hydration (Supabase PostgreSQL + Central Server + Firestore fallback)
    void Promise.allSettled([
      idbHydratedPromise,
      supabaseSync.pullSingleDocumentSnapshot(),
      supabaseSync.pullAllFromCloud(),
      serverSync.fetchFromCentralServer(),
      firestoreSync.pullSingleDocumentSnapshot(),
      firestoreSync.pullAllFromCloud(),
    ])
      .then((results) => {
        const [idbRes, supaSnapRes, supaFullRes, serverRes, firestoreSnapRes, firestoreFullRes] = results;
        const idbData = idbRes.status === 'fulfilled' ? idbRes.value : {};
        const supaSnap = supaSnapRes.status === 'fulfilled' ? (supaSnapRes.value as any) : { success: false };
        const supaFull = supaFullRes.status === 'fulfilled' ? (supaFullRes.value as any) : { connected: false };
        const server = serverRes.status === 'fulfilled' ? (serverRes.value as any) : { success: false };
        const firestoreSnap = firestoreSnapRes.status === 'fulfilled' ? (firestoreSnapRes.value as any) : { success: false };
        const firestoreFull = firestoreFullRes.status === 'fulfilled' ? (firestoreFullRes.value as any) : { connected: false };

        const localProducts =
          (idbData as any)?.products?.length >= INITIAL_PRODUCTS.length
            ? (idbData as any).products
            : INITIAL_PRODUCTS;

        // Determine remote datasets
        const supaSnapProds =
          supaSnap.success && Array.isArray(supaSnap.data?.products)
            ? supaSnap.data.products
            : [];
        const supaFullProds =
          supaFull.connected && Array.isArray(supaFull.data?.products)
            ? supaFull.data.products
            : [];
        const serverProds =
          server.success && Array.isArray(server.data?.products) ? server.data.products : [];
        const firestoreSnapProds =
          firestoreSnap.success && Array.isArray(firestoreSnap.data?.products)
            ? firestoreSnap.data.products
            : [];
        const firestoreFullProds =
          firestoreFull.connected && Array.isArray(firestoreFull.data?.products)
            ? firestoreFull.data.products
            : [];

        const candidateRemoteSets = [
          { source: 'supabaseSnap', prods: supaSnapProds, data: supaSnap.data },
          { source: 'supabaseFull', prods: supaFullProds, data: supaFull.data },
          { source: 'server', prods: serverProds, data: server.data },
          { source: 'firestoreSnap', prods: firestoreSnapProds, data: firestoreSnap.data },
          { source: 'firestoreFull', prods: firestoreFullProds, data: firestoreFull.data },
        ].filter((s) => Array.isArray(s.prods) && s.prods.length > 0);

        // Sort candidates:
        // 1. Highest product count wins
        // 2. Highest biostimulant classification count wins (148 vs stale 104)
        // 3. Supabase and Server precedence over legacy Firestore
        candidateRemoteSets.sort((a, b) => {
          if (b.prods.length !== a.prods.length) {
            return b.prods.length - a.prods.length;
          }
          const aStim = a.prods.filter((p: any) => p.categoryId === 'CAT-01').length;
          const bStim = b.prods.filter((p: any) => p.categoryId === 'CAT-01').length;
          if (bStim !== aStim) {
            return bStim - aStim;
          }
          if (b.source.startsWith('supabase')) return 1;
          if (a.source.startsWith('supabase')) return -1;
          if (b.source === 'server') return 1;
          if (a.source === 'server') return -1;
          return 0;
        });

        const bestRemoteProds = candidateRemoteSets[0]?.prods || [];
        const bestRemoteData = candidateRemoteSets[0]?.data;

        const remoteStimCount = bestRemoteProds.filter((p: any) => p.categoryId === 'CAT-01').length;
        const localStimCount = localProducts.filter((p: any) => p.categoryId === 'CAT-01').length;

        // Case A: Local device has strictly MORE products than any remote source!
        // Immediately broadcast local catalog to central server and cloud snapshot + collections!
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
            firestoreSync.pushFullSnapshot(fullData),
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
        // Hydrate local device immediately if remote is newer or has upgraded classifications!
        if (
          bestRemoteData &&
          bestRemoteProds.length >= INITIAL_PRODUCTS.length &&
          (bestRemoteProds.length > localProducts.length ||
            remoteStimCount >= localStimCount ||
            localStimCount < initialStimCount)
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
            dbStorage.setPendingCloudSync(false);
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

  // Listen to browser History popstate and app:route-change to sync top-level view
  useEffect(() => {
    const handleRouteChange = () => {
      const r = parseCurrentRoute();
      if (r.type === 'admin') {
        setCurrentView('admin');
        setInspectedOrder(null);
        setSharedCatalog(null);
      } else if (r.type === 'builder') {
        setCurrentView('catalog_builder');
        setInspectedOrder(null);
        setSharedCatalog(null);
      } else if (r.type === 'order') {
        const orderId = r.orderId;
        const localMatch = orders.find(
          (o) => o.orderNumber === orderId || o.id === orderId
        );
        if (localMatch) {
          setInspectedOrder(localMatch);
        }
      } else if (r.type === 'shared_catalog') {
        const catId = r.catalogId;
        const localCat = dbStorage.getSharedCatalogById(catId);
        if (localCat) {
          setSharedCatalog(localCat);
        }
      } else {
        // 'home' | 'company' | 'companies' | 'product' | 'financing'
        setCurrentView('catalog');
        setInspectedOrder(null);
        setSharedCatalog(null);
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('app:route-change', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('app:route-change', handleRouteChange);
    };
  }, [orders]);

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
          supabaseSync.pushSingleDocumentSnapshot(payload),
          supabaseSync.pushAllToCloud(payload),
          serverSync.syncToCentralServer(payload),
          firestoreSync.pushFullSnapshot(payload),
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
    // 1. Supabase Realtime WebSocket listener for instantaneous zero-refresh sync across all open browsers
    const realtimeChannel = supabase
      .channel('catalog_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_snapshots' },
        (payload) => {
          const newData = (payload.new as any)?.data;
          if (newData && Array.isArray(newData.products) && newData.products.length >= INITIAL_PRODUCTS.length) {
            applyRemoteCatalogData(newData);
          }
        }
      )
      .subscribe();

    const checkServerUpdates = async () => {
      // 1. Check Supabase first (Ultra-fast and authoritative)
      try {
        const supaRes = await supabaseSync.pullSingleDocumentSnapshot();
        if (supaRes.success && supaRes.data?.products?.length >= INITIAL_PRODUCTS.length) {
          applyRemoteCatalogData(supaRes.data);
          return;
        }
      } catch (err) {
        console.warn('[Sync] Supabase quick check error:', err);
      }

      // 2. Fetch latest updates from central server or single-doc firestore snapshot
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
      const sStim = sData?.products?.filter((p: any) => p.categoryId === 'CAT-01').length || 0;
      const fStim = fData?.products?.filter((p: any) => p.categoryId === 'CAT-01').length || 0;

      const bestRemote =
        sCount > fCount || (sCount === fCount && sStim >= fStim) ? sData : fData || sData;
      if (!bestRemote || !bestRemote.products?.length) return;

      const incomingProds = bestRemote.products;
      const incomingStim = incomingProds.filter((p: any) => p.categoryId === 'CAT-01').length;

      setProducts((prev) => {
        const localList = prev.length >= dbStorage.getProducts().length ? prev : dbStorage.getProducts();
        const localStim = localList.filter((p: any) => p.categoryId === 'CAT-01').length;

        // If incoming has the audited biostimulants upgrade (148) and local is stale (< 148),
        // adopt incoming immediately across open tabs!
        if (incomingStim > localStim && prev.length <= incomingProds.length) {
          dbStorage.saveProducts(incomingProds);
          dbStorage.setPendingCloudSync(false);
          return incomingProds;
        }

        // Build map of current local products
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
      supabase.removeChannel(realtimeChannel);
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
    void supabaseSync.pushSingleDocumentSnapshot({
      ...dbStorage.getData(),
      products: updatedProducts,
    });
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
    void supabaseSync.submitFinancingRequest(newReq);
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
      // 0. Check remote cloud collections first (Two-Way Sync):
      // If remote has MORE products than this local device, pull and update local immediately!
      const [remoteSupabase, remoteCloud, remoteServer] = await Promise.all([
        supabaseSync.pullSingleDocumentSnapshot(),
        firestoreSync.pullAllFromCloud(),
        serverSync.fetchFromCentralServer(),
      ]);

      const supaProds = remoteSupabase.success && Array.isArray(remoteSupabase.data?.products)
        ? remoteSupabase.data.products
        : [];
      const cloudProds = remoteCloud.connected && Array.isArray(remoteCloud.data?.products)
        ? remoteCloud.data.products
        : [];
      const serverProds = remoteServer.success && Array.isArray(remoteServer.data?.products)
        ? remoteServer.data.products
        : [];

      const candidateRemotes = [
        { prods: supaProds, data: remoteSupabase.data },
        { prods: cloudProds, data: remoteCloud.data },
        { prods: serverProds, data: remoteServer.data },
      ].sort((a, b) => b.prods.length - a.prods.length);

      const bestRemoteProds = candidateRemotes[0]?.prods || [];
      const bestRemoteData = candidateRemotes[0]?.data;

      if (bestRemoteData && bestRemoteProds.length > products.length) {
        // Upgrade local device!
        const rd = bestRemoteData;
        if (rd.products?.length) {
          setProducts(rd.products);
          dbStorage.saveProducts(rd.products);
        }
        if (rd.packages?.length) {
          setPackages(rd.packages);
          dbStorage.savePackages(rd.packages);
        }
        if (rd.companies?.length) {
          setCompanies(rd.companies);
          dbStorage.saveCompanies(rd.companies);
        }
        if (rd.categories?.length) {
          setCategories(rd.categories);
          dbStorage.saveCategories(rd.categories);
        }
        if (rd.subCategories?.length) {
          setSubCategories(rd.subCategories);
          dbStorage.saveSubCategories(rd.subCategories);
        }
        setCloudConnected(true);
        setLastCloudSyncAt(new Date().toISOString());
        dbStorage.setPendingCloudSync(false);
        setHasUnsyncedChanges(false);
        addBuilderToast(
          `تم سحب وتحديث الكتالوج من السحابة بنجاح: تم تحديث جهازك إلى (${bestRemoteProds.length} منتج) ✓`,
          'success'
        );
        return;
      }

      // If local device has equal or more products, push local catalog to all remotes!
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

      const [supaSnapRes, supaFullRes, serverResult, fullSnapshotRes, singleDocRes] = await Promise.all([
        supabaseSync.pushSingleDocumentSnapshot(fullPayload),
        supabaseSync.pushAllToCloud(fullPayload),
        serverSync.syncToCentralServer(fullPayload),
        firestoreSync.pushFullSnapshot(fullPayload),
        firestoreSync.pushSingleDocumentSnapshot(fullPayload),
      ]);

      if (supaSnapRes.success || fullSnapshotRes.success || singleDocRes.success || serverResult.success) {
        setCloudConnected(true);
        setLastCloudSyncAt(new Date().toISOString());
        dbStorage.setPendingCloudSync(false);
        setHasUnsyncedChanges(false);
        addBuilderToast(
          `تم رفع ومزامنة الكتالوج بالكامل (${products.length} منتج) لجميع الأجهزة والزوار بنجاح عبر Supabase وCloud ✓`,
          'success'
        );
      } else {
        const errMsg = supaSnapRes.error || fullSnapshotRes.error || singleDocRes.error || serverResult.error || 'تعذر المزامنة مع السحابة';
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

    // Sync order to Supabase, Cloud Firestore & backend webhook/store
    void firestoreSync.saveOrder(newOrder);
    void supabaseSync.submitOrder(newOrder);
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
    navigateTo('/');
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
            navigateTo('/');
          }}
          onOpenAdmin={() => {
            setInspectedOrder(null);
            setCurrentView('admin');
            navigateTo('/admin');
          }}
        />
      ) : sharedCatalog ? (
        <SharedCatalogView
          catalog={sharedCatalog}
          currentUser={currentUser}
          onSubmitOrder={handleSubmitOrder}
          onOpenFullStore={() => {
            setSharedCatalog(null);
            navigateTo('/');
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
              onBackToCatalog={() => {
                setCurrentView('catalog');
                navigateTo('/');
              }}
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
          onOpenAdmin={() => {
            setCurrentView('admin');
            navigateTo('/admin');
          }}
          onOpenCatalogBuilder={() => {
            setCurrentView('catalog_builder');
            navigateTo('/builder');
          }}
          isAdminLoggedIn={isAdminLoggedIn}
          currentUser={currentUser}
          activeSalesRep={activeSalesRep}
          onClearActiveSalesRep={handleClearActiveSalesRep}
          teamMembers={teamMembers}
          onEmployeeLogin={handleDetailedLogin}
          onLogout={handleLogout}
          onSubmitOrder={handleSubmitOrder}
          onSubmitFinancingRequest={handleSubmitFinancingRequest}
          onSaveProducts={handleSaveProducts}
        />
      ) : (
        <ErrorBoundary
          fallbackTitle="لوحة الإدارة الرئيسية"
          onReset={() => {
            setCurrentView('admin');
            navigateTo('/admin');
          }}
        >
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
            onBackToCatalog={() => {
              setCurrentView('catalog');
              navigateTo('/');
            }}
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
        </ErrorBoundary>
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
