import React, { useState, useEffect } from 'react';
import { PublicCatalogPage } from './pages/PublicCatalogPage';
import { AdminPage } from './pages/AdminPage';
import { OrderDetailsPage } from './components/common/OrderDetailsPage';
import { SharedCatalogView } from './components/catalog/SharedCatalogView';
import { PdfGeneratorView } from './components/admin/PdfGeneratorView';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { canBuildCustomCatalog } from './utils/permissions';

import {
  dbStorage,
  DbData,
} from './services/dbStorage';
import { firestoreSync } from './services/firestoreSync';
import { auth, signInWithGoogleForCloudSync } from './services/firebase';

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
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);
  const [sharedCatalog, setSharedCatalog] = useState<SharedCustomCatalog | null>(null);
  const [builderToasts, setBuilderToasts] = useState<ToastMessage[]>([]);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | undefined>(undefined);
  const [cloudError, setCloudError] = useState<string | undefined>(undefined);

  const addBuilderToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setBuilderToasts((prev) => [...prev.slice(-1), { id, message, type }]);
    setTimeout(() => {
      setBuilderToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
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

    // 3. Pull live catalog snapshot from Cloud Firestore (syncs across devices/Vercel)
    firestoreSync
      .pullAllFromCloud()
      .then((cloudRes) => {
        setCloudConnected(cloudRes.connected);
        if (cloudRes.error) setCloudError(cloudRes.error);
        if (cloudRes.connected) {
          setLastCloudSyncAt(new Date().toISOString());
          const d = cloudRes.data;
          if (d.categories?.length) {
            setCategories(d.categories);
            dbStorage.saveCategories(d.categories);
          }
          if (d.companies?.length) {
            setCompanies(d.companies);
            dbStorage.saveCompanies(d.companies);
          }
          if (d.subCategories?.length) {
            setSubCategories(d.subCategories);
            dbStorage.saveSubCategories(d.subCategories);
          }
          if (d.products?.length) {
            setProducts(d.products);
            dbStorage.saveProducts(d.products);
          }
          if (d.packages?.length) {
            setPackages(d.packages);
            dbStorage.savePackages(d.packages);
          }
          if (d.advertisements?.length) {
            setAdvertisements(d.advertisements);
            dbStorage.saveAdvertisements(d.advertisements);
          }
          if (d.images?.length) {
            setImages(d.images);
            dbStorage.saveImages(d.images);
          }
          if (d.pdfDividers?.length) {
            dbStorage.savePdfDividers(d.pdfDividers);
          }
          if (d.orders?.length) {
            setOrders(d.orders);
            dbStorage.saveOrders(d.orders);
          }
          if (d.teamMembers?.length) {
            setTeamMembers(d.teamMembers);
            dbStorage.saveTeamMembers(d.teamMembers);
          }
          if (d.priceHistory?.length) {
            setPriceHistory(d.priceHistory);
          }
          if (d.settings) {
            setSettings(d.settings);
            dbStorage.saveSettings(d.settings);
          }

          // If Cloud Firestore is completely empty on first launch while authenticated, attempt initial seeding
          if (auth.currentUser && !d.products?.length && !d.companies?.length) {
            void firestoreSync.pushFullSnapshot({
              ...dbStorage.getData(),
              pdfDividers: dbStorage.getPdfDividers(),
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Save Handlers with DB Storage Persistence + Live Cloud Firestore Sync
  const handleSaveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    dbStorage.saveProducts(updatedProducts);
    dbStorage.addAuditLog('تحديث المنتجات', 'Product', 'تم حفظ تعديلات قائمة المنتجات');
    void firestoreSync.syncCollection('products', updatedProducts);
  };

  const handleSaveSubCategories = (updatedSubs: CompanySubCategory[]) => {
    setSubCategories(updatedSubs);
    dbStorage.saveSubCategories(updatedSubs);
    dbStorage.addAuditLog('تحديث الأقسام الفرعية', 'SubCategory', 'تم حفظ تعديلات أقسام الشركات الفرعية');
    void firestoreSync.syncCollection('subCategories', updatedSubs);
  };

  const handleSaveTeamMembers = (updatedTeam: TeamMember[]) => {
    setTeamMembers(updatedTeam);
    dbStorage.saveTeamMembers(updatedTeam);
    void firestoreSync.syncCollection('team', updatedTeam);
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
    void firestoreSync.syncCollection('packages', updatedPackages);
  };

  const handleSaveCategories = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    dbStorage.saveCategories(updatedCategories);
    dbStorage.addAuditLog('تحديث الأقسام', 'Category', 'تم حفظ تعديلات الأقسام الرئيسية');
    void firestoreSync.syncCollection('categories', updatedCategories);
  };

  const handleSaveCompanies = (updatedCompanies: Company[]) => {
    setCompanies(updatedCompanies);
    dbStorage.saveCompanies(updatedCompanies);
    dbStorage.addAuditLog('تحديث الشركات', 'Company', 'تم حفظ تعديلات أسماء ومعلومات الشركات المصنعة');
    void firestoreSync.syncCollection('companies', updatedCompanies);
  };

  const handleSaveImages = (updatedImages: CompanyImage[]) => {
    setImages(updatedImages);
    dbStorage.saveImages(updatedImages);
    void firestoreSync.syncCollection('images', updatedImages);
  };

  const handleSaveAdvertisements = (updatedAds: Advertisement[]) => {
    setAdvertisements(updatedAds);
    dbStorage.saveAdvertisements(updatedAds);
    void firestoreSync.syncCollection('advertisements', updatedAds);
  };

  const handleSaveSettings = (updatedSettings: CatalogSettings) => {
    setSettings(updatedSettings);
    dbStorage.saveSettings(updatedSettings);
    void firestoreSync.saveSettings(updatedSettings);
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
    setOrders(updated);
    dbStorage.saveOrders(updated);
    void firestoreSync.updateOrderStatus(orderId, status);
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
      const res = await firestoreSync.pushFullSnapshot({
        ...dbStorage.getData(),
        pdfDividers: dbStorage.getPdfDividers(),
      });
      setCloudConnected(res.success);
      if (res.success) {
        setLastCloudSyncAt(new Date().toISOString());
      } else {
        setCloudError(res.error);
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
          onEmployeeLogin={handleDetailedLogin}
          onLogout={handleLogout}
          onSubmitOrder={handleSubmitOrder}
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
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onBatchUpdatePrices={handleBatchUpdatePrices}
          onAddPriceHistory={handleAddPriceHistory}
          onAddImportLog={handleAddImportLog}
          onBackToCatalog={() => setCurrentView('catalog')}
          isAdminLoggedIn={isAdminLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          cloudConnected={cloudConnected}
          isCloudSyncing={isCloudSyncing}
          lastCloudSyncAt={lastCloudSyncAt}
          cloudError={cloudError}
          onSyncToCloud={handleSyncToCloud}
          onConnectGoogleCloud={handleConnectGoogleCloud}
        />
      )}
    </div>
  );
}
