import React, { useState, useEffect } from 'react';
import { AdminSidebar, AdminTab } from '../components/admin/AdminSidebar';
import { AdminOverview } from '../components/admin/AdminOverview';
import { CategoryManager } from '../components/admin/CategoryManager';
import { CompanyManager } from '../components/admin/CompanyManager';
import { ProductManager } from '../components/admin/ProductManager';
import { ImageGalleryManager } from '../components/admin/ImageGalleryManager';
import { PriceManager } from '../components/admin/PriceManager';
import { ExcelImporter } from '../components/admin/ExcelImporter';
import { PdfGeneratorView } from '../components/admin/PdfGeneratorView';
import { OrderManager } from '../components/admin/OrderManager';
import { AdvertisementManager } from '../components/admin/AdvertisementManager';
import { CatalogSettingsManager } from '../components/admin/CatalogSettingsManager';
import { AuditLogViewer } from '../components/admin/AuditLogViewer';
import { AiCatalogExtractor } from '../components/admin/AiCatalogExtractor';
import { HomeShowcasesManager } from '../components/admin/HomeShowcasesManager';
import { IslamicFinancingManager } from '../components/admin/IslamicFinancingManager';
import { ToastContainer, ToastMessage } from '../components/common/Toast';


import { TeamManager } from '../components/admin/TeamManager';

import {
  Product,
  Package,
  Category,
  Company,
  CompanyImage,
  Advertisement,
  Order,
  PriceHistory,
  CatalogSettings,
  AuditLog,
  CompanySubCategory,
  TeamMember,
  IslamicFinancingRequest,
} from '../types';

import { ShieldCheck, Lock, User, KeyRound, LogIn, Sparkles, ArrowRight, LogOut, Cloud, RefreshCw, Download, Upload } from 'lucide-react';
import { canAccessAdminTab, getFirstAllowedTab, hasDashboardAccess } from '../utils/permissions';

interface AdminPageProps {
  products: Product[];
  packages: Package[];
  categories: Category[];
  companies: Company[];
  subCategories?: CompanySubCategory[];
  images: CompanyImage[];
  advertisements: Advertisement[];
  orders: Order[];
  financingRequests?: IslamicFinancingRequest[];
  teamMembers?: TeamMember[];
  currentUser?: TeamMember | null;
  priceHistory: PriceHistory[];
  settings: CatalogSettings;
  auditLogs: AuditLog[];

  onSaveProducts: (products: Product[]) => void;
  onSavePackages: (packages: Package[]) => void;
  onSaveCategories: (categories: Category[]) => void;
  onSaveCompanies: (companies: Company[]) => void;
  onSaveSubCategories?: (subs: CompanySubCategory[]) => void;
  onSaveImages: (images: CompanyImage[]) => void;
  onSaveAdvertisements: (ads: Advertisement[]) => void;
  onSaveSettings: (settings: CatalogSettings) => void;
  onSaveTeamMembers?: (team: TeamMember[]) => void;
  onSaveFinancingRequests?: (requests: IslamicFinancingRequest[]) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onBatchUpdatePrices: (
    updates: { productId: string; packageId: string; newPrice: number }[],
    source: 'manual' | 'excel',
    updatedBy: string
  ) => { updatedCount: number; errors: string[] };
  onAddPriceHistory: (entry: Omit<PriceHistory, 'id' | 'createdAt'>) => void;
  onAddImportLog: (log: any) => void;

  onBackToCatalog: () => void;
  isAdminLoggedIn: boolean;
  onLogin: (email: string, pass: string) => boolean;
  onLogout: () => void;
  cloudConnected?: boolean;
  hasUnsyncedChanges?: boolean;
  isCloudSyncing?: boolean;
  lastCloudSyncAt?: string;
  cloudError?: string;
  onSyncToCloud?: () => Promise<void> | void;
  onConnectGoogleCloud?: () => Promise<void> | void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  products,
  packages,
  categories,
  companies,
  subCategories = [],
  images,
  advertisements,
  orders,
  financingRequests = [],
  teamMembers = [],
  currentUser = null,
  priceHistory,
  settings,
  auditLogs,

  onSaveProducts,
  onSavePackages,
  onSaveCategories,
  onSaveCompanies,
  onSaveSubCategories,
  onSaveImages,
  onSaveAdvertisements,
  onSaveSettings,
  onSaveTeamMembers,
  onSaveFinancingRequests,
  onUpdateOrderStatus,
  onBatchUpdatePrices,
  onAddPriceHistory,
  onAddImportLog,

  onBackToCatalog,
  isAdminLoggedIn,
  onLogin,
  onLogout,
  cloudConnected = false,
  hasUnsyncedChanges = false,
  isCloudSyncing = false,
  lastCloudSyncAt,
  cloudError,
  onSyncToCloud,
  onConnectGoogleCloud,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(() => getFirstAllowedTab(currentUser) || 'overview');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const firstAllowedTab = getFirstAllowedTab(currentUser);
  useEffect(() => {
    if (isAdminLoggedIn && currentUser && firstAllowedTab && !canAccessAdminTab(currentUser, activeTab)) {
      setActiveTab(firstAllowedTab);
    }
  }, [isAdminLoggedIn, currentUser, firstAllowedTab, activeTab]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(loginEmail, loginPassword);
    if (!ok) {
      setLoginError('بيانات الدخول غير صحيحة. يرجى المراجعة المحاولة.');
    } else {
      setLoginError('');
      addToast('تم تسجيل الدخول بنجاح إلى لوحة الأدمن', 'success');
    }
  };

  const handleExportBackupJson = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        categories,
        companies,
        subCategories,
        products,
        packages,
        advertisements,
        images,
        settings,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cropsa-catalog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('تم تصدير نسخة احتياطية كاملة (JSON)', 'success');
    } catch {
      addToast('تعذر تصدير النسخة الاحتياطية', 'error');
    }
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (Array.isArray(parsed.categories)) onSaveCategories(parsed.categories);
        if (Array.isArray(parsed.companies)) onSaveCompanies(parsed.companies);
        if (Array.isArray(parsed.subCategories) && onSaveSubCategories) onSaveSubCategories(parsed.subCategories);
        if (Array.isArray(parsed.products)) onSaveProducts(parsed.products);
        if (Array.isArray(parsed.packages)) onSavePackages(parsed.packages);
        if (Array.isArray(parsed.advertisements)) onSaveAdvertisements(parsed.advertisements);
        if (Array.isArray(parsed.images)) onSaveImages(parsed.images);
        if (parsed.settings) onSaveSettings(parsed.settings);
        addToast('تم استيراد النسخة الاحتياطية بنجاح ✓', 'success');
      } catch {
        addToast('ملف النسخة الاحتياطية غير صالح', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const pendingOrdersCount = orders.filter((o) => o.status === 'new').length;
  const pendingFinancingCount = financingRequests.filter((r) => r.status === 'new').length;

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4 dir-rtl">
        <div className="bg-[#FAF8F5] rounded-3xl p-8 max-w-md w-full shadow-xl border border-[#E5E2D9] space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-[#E5E2D9] text-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-[#2D2D24]">دخول لوحة تحكم الأدمن</h2>
            <p className="text-xs text-[#8A8A6D] font-medium">سجل الدخول لإدارة المنتجات، الأسعار، والكتالوج المطبوع</p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#2D2D24] block mb-1">اسم المستخدم أو البريد الإلكتروني</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8A8A6D] absolute right-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="مثال: admin أو sales_user"
                  className="w-full pr-9 pl-3 py-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#2D2D24] block mb-1">كلمة المرور</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#8A8A6D] absolute right-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-9 pl-3 py-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#5A5A40] hover:bg-[#484833] text-[#F9F8F6] font-bold text-sm py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>تسجيل الدخول</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="text-xs font-bold text-[#5A5A40] hover:underline"
            >
              ← العودة للكتالوج العام للعملاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser && !hasDashboardAccess(currentUser)) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 dir-rtl">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-stone-200 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-stone-900">صلاحيات مقتصرة على الكتالوج</h2>
          <p className="text-xs text-stone-600 font-medium leading-relaxed">
            أهلاً <strong>{currentUser.name}</strong>، حسابك مخصص لاستخدام الكتالوج وعرض روابط الطلبيات ولا يتضمن صلاحيات دخول لوحة الإدارة.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="flex-1 h-11 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للكتالوج</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 h-11 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D2D24] flex dir-rtl">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
        onBackToCatalog={onBackToCatalog}
        pendingOrdersCount={pendingOrdersCount}
        pendingFinancingCount={pendingFinancingCount}
        currentUser={currentUser}
        logoUrl={settings.logoUrl}
      />

      {/* Main Admin Dashboard Body */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto">
        {(!cloudConnected || hasUnsyncedChanges || Boolean(cloudError)) && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-amber-950 block">
                  {hasUnsyncedChanges
                    ? 'تنبيه: توجد تعديلات محفوظة في المتصفح (أو IndexedDB) لم تُرفع للسحابة بعد'
                    : 'تنبيه: الوضع محلي حالياً — لم يكتمل الاتصال بـ Cloud Firestore'}
                </span>
                <span className="text-[11px] font-medium text-amber-900/80 block">
                  {cloudError || 'لحفظ المنتجات لجميع الأجهزة، سجل عبر Google للسحابة أو فعّل Anonymous Auth في Firebase وانشر firestore.rules.'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="تنزيل نسخة احتياطية كاملة"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير</span>
              </button>

              <label className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleImportBackupJson}
                  className="hidden"
                />
              </label>

              {onConnectGoogleCloud && (
                <button
                  type="button"
                  onClick={onConnectGoogleCloud}
                  className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-900 border border-amber-400 rounded-xl text-[11px] font-black cursor-pointer"
                >
                  ربط Google للسحابة
                </button>
              )}
              {onSyncToCloud && (
                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={onSyncToCloud}
                  className="px-3.5 py-1.5 bg-[#046A47] hover:bg-[#035237] disabled:opacity-60 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'جاري الرفع...' : 'رفع للسحابة الآن'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (!currentUser || canAccessAdminTab(currentUser, 'overview')) && (
          <AdminOverview
            products={products}
            packages={packages}
            companies={companies}
            categories={categories}
            orders={orders}
            priceHistory={priceHistory}
            onNavigateTab={setActiveTab}
            cloudConnected={cloudConnected}
            isCloudSyncing={isCloudSyncing}
            lastCloudSyncAt={lastCloudSyncAt}
            cloudError={cloudError}
            onSyncToCloud={onSyncToCloud}
            onConnectGoogleCloud={onConnectGoogleCloud}
          />
        )}

        {activeTab === 'categories' && (!currentUser || canAccessAdminTab(currentUser, 'categories')) && (
          <CategoryManager
            categories={categories}
            products={products}
            onSaveCategories={onSaveCategories}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'companies' && (!currentUser || canAccessAdminTab(currentUser, 'companies')) && (
          <CompanyManager
            companies={companies}
            categories={categories}
            subCategories={subCategories}
            products={products}
            packages={packages}
            priceHistory={priceHistory}
            images={images}
            onSaveCompanies={onSaveCompanies}
            onSaveProducts={onSaveProducts}
            onSavePackages={onSavePackages}
            onSaveSubCategories={onSaveSubCategories}
            onAddPriceHistory={onAddPriceHistory}
            onBatchUpdatePrices={onBatchUpdatePrices}
            onSaveImages={onSaveImages}
            onAddImportLog={onAddImportLog}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'ai_catalog' && (!currentUser || canAccessAdminTab(currentUser, 'ai_catalog')) && (
          <AiCatalogExtractor
            companies={companies}
            categories={categories}
            existingProducts={products}
            existingPackages={packages}
            companyImages={images}
            onSaveProducts={onSaveProducts}
            onSavePackages={onSavePackages}
            onSaveImages={onSaveImages}
            onSaveCategories={onSaveCategories}
            onAddPriceHistory={onAddPriceHistory}
            onAddImportLog={onAddImportLog}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'products' && (!currentUser || canAccessAdminTab(currentUser, 'products')) && (
          <ProductManager
            products={products}
            packages={packages}
            companies={companies}
            categories={categories}
            companyImages={images}
            onSaveProducts={onSaveProducts}
            onSavePackages={onSavePackages}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'gallery' && (!currentUser || canAccessAdminTab(currentUser, 'gallery')) && (
          <ImageGalleryManager
            images={images}
            companies={companies}
            products={products}
            onSaveImages={onSaveImages}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'prices' && (!currentUser || canAccessAdminTab(currentUser, 'prices')) && (
          <PriceManager
            products={products}
            packages={packages}
            companies={companies}
            priceHistory={priceHistory}
            onSavePackages={onSavePackages}
            onAddPriceHistory={onAddPriceHistory}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'excel' && (!currentUser || canAccessAdminTab(currentUser, 'excel')) && (
          <ExcelImporter
            companies={companies}
            onBatchUpdatePrices={onBatchUpdatePrices}
            onAddImportLog={onAddImportLog}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'pdf' && (!currentUser || canAccessAdminTab(currentUser, 'pdf')) && (
          <PdfGeneratorView
            products={products}
            packages={packages}
            categories={categories}
            companies={companies}
            settings={settings}
            advertisements={advertisements}
            onShowToast={addToast}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'orders' && (!currentUser || canAccessAdminTab(currentUser, 'orders')) && (
          <OrderManager orders={orders} onUpdateOrderStatus={onUpdateOrderStatus} onShowToast={addToast} />
        )}

        {activeTab === 'financing' && (!currentUser || canAccessAdminTab(currentUser, 'financing')) && (
          <IslamicFinancingManager
            requests={financingRequests}
            settings={settings}
            onSaveRequests={onSaveFinancingRequests || (() => {})}
            onSaveSettings={onSaveSettings}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'team' && (!currentUser || canAccessAdminTab(currentUser, 'team')) && (
          <TeamManager
            teamMembers={teamMembers}
            onSaveTeamMembers={onSaveTeamMembers || (() => {})}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'showcases' && (!currentUser || canAccessAdminTab(currentUser, 'showcases')) && (
          <HomeShowcasesManager
            settings={settings}
            products={products}
            packages={packages}
            companies={companies}
            categories={categories}
            onSaveSettings={onSaveSettings}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'advertisements' && (!currentUser || canAccessAdminTab(currentUser, 'advertisements')) && (
          <AdvertisementManager
            advertisements={advertisements}
            onSaveAdvertisements={onSaveAdvertisements}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'settings' && (!currentUser || canAccessAdminTab(currentUser, 'settings')) && (
          <CatalogSettingsManager settings={settings} onSaveSettings={onSaveSettings} onShowToast={addToast} />
        )}

        {activeTab === 'audit' && (!currentUser || canAccessAdminTab(currentUser, 'audit')) && <AuditLogViewer logs={auditLogs} />}
      </main>

      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};
