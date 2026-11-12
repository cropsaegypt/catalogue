import React, { useState } from 'react';
import {
  Home,
  ShoppingBag,
  Building2,
  Sparkles,
  Layers,
  X,
  PackageCheck,
  MessageCircle,
  CheckCircle2,
  ArrowLeft,
  Banknote,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import { ToastContainer, ToastMessage } from '../components/common/Toast';
import { EmployeeLoginModal } from '../components/common/EmployeeLoginModal';
import { ProductCard } from '../components/catalog/ProductCard';
import { ProductModal } from '../components/catalog/ProductModal';
import { QuickAddQuantityModal } from '../components/catalog/QuickAddQuantityModal';
import { BasketDrawer } from '../components/catalog/BasketDrawer';
import { CompanyDirectoryModal } from '../components/catalog/CompanyDirectoryModal';
import { OffersBannerCarousel } from '../components/catalog/OffersBannerCarousel';
import {
  OnboardingBrowseSelector,
} from '../components/catalog/OnboardingBrowseSelector';
import { HomeShowcaseBoxes } from '../components/catalog/HomeShowcaseBoxes';
import { FloatingOrderBar } from '../components/catalog/FloatingOrderBar';
import { matchesProductSearch } from '../utils/agriculturalSearch';
import {
  computeCrossFilterAvailability,
  getCategoryDisplayPath,
  getProductMainCategoryId,
  getProductSubCategoryId,
  productMatchesCategoryFilter,
} from '../utils/categoryHierarchy';

import {
  Product,
  Package,
  Category,
  Company,
  CompanySubCategory,
  Advertisement,
  OrderItem,
  CatalogSettings,
  Order,
  TeamMember,
  HomeShowcaseKey,
  HomeShowcaseItem,
  IslamicFinancingRequest,
} from '../types';
import { IslamicFinancingPage } from './IslamicFinancingPage';
import { hasDashboardAccess, canBuildCustomCatalog, ROLE_METADATA } from '../utils/permissions';
import { resolveHomeShowcases } from '../utils/homeShowcases';

interface PublicCatalogPageProps {
  products: Product[];
  packages: Package[];
  categories: Category[];
  companies: Company[];
  subCategories?: CompanySubCategory[];
  advertisements: Advertisement[];
  settings: CatalogSettings;
  onOpenAdmin: () => void;
  onOpenCatalogBuilder?: () => void;
  isAdminLoggedIn: boolean;
  currentUser?: TeamMember | null;
  onEmployeeLogin?: (
    usernameOrEmail: string,
    password: string
  ) => { success: boolean; user?: TeamMember; error?: string };
  onLogout?: () => void;
  onSubmitOrder: (customerData: any) => Promise<Order | any>;
  onSubmitFinancingRequest?: (
    payload: Omit<IslamicFinancingRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'>
  ) => Promise<IslamicFinancingRequest>;
}

export const PublicCatalogPage: React.FC<PublicCatalogPageProps> = ({
  products,
  packages,
  categories,
  companies,
  subCategories = [],
  advertisements,
  settings,
  onOpenAdmin,
  onOpenCatalogBuilder,
  isAdminLoggedIn,
  currentUser = null,
  onEmployeeLogin,
  onLogout,
  onSubmitOrder,
  onSubmitFinancingRequest,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedShowcaseKey, setSelectedShowcaseKey] = useState<HomeShowcaseKey | null>(null);

  const [basketItems, setBasketItems] = useState<OrderItem[]>([]);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCompanyDirectoryOpen, setIsCompanyDirectoryOpen] = useState(false);
  const [mobileSheetMode, setMobileSheetMode] = useState<'closed' | 'companies' | 'categories'>('closed');
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [selectedPackageModal, setSelectedPackageModal] = useState<Package | undefined>(undefined);
  const [quickAddTarget, setQuickAddTarget] = useState<{
    product: Product;
    pkg?: Package;
    promoDiscountPercent?: number;
    promoLabel?: string;
  } | null>(null);
  const [isEmployeeLoginOpen, setIsEmployeeLoginOpen] = useState(false);
  const [isFinancingPageOpen, setIsFinancingPageOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev.slice(-1), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  };

  const totalBasketAmount = basketItems.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);

  const isHomeDefaultView =
    searchQuery.trim() === '' &&
    selectedCategoryIds.length === 0 &&
    selectedSubCategoryIds.length === 0 &&
    selectedCompanyIds.length === 0 &&
    selectedShowcaseKey === null;

  const resetAllFilters = () => {
    setSelectedCategoryIds([]);
    setSelectedSubCategoryIds([]);
    setSelectedCompanyIds([]);
    setSelectedShowcaseKey(null);
    setSearchQuery('');
  };

  const toggleCompany = (id: string) => {
    const nextCompanies = selectedCompanyIds.includes(id)
      ? selectedCompanyIds.filter((c) => c !== id)
      : [...selectedCompanyIds, id];

    setSelectedCompanyIds(nextCompanies);

    // Prune any selected categories/subcategories that don't have products in nextCompanies
    if (nextCompanies.length > 0) {
      const pool = products.filter((p) => p.active && nextCompanies.includes(p.companyId));
      const availableMainSet = new Set(
        pool.map((p) => getProductMainCategoryId(p, categories))
      );
      const availableSubSet = new Set(
        pool.map((p) => getProductSubCategoryId(p, categories)).filter(Boolean) as string[]
      );
      setSelectedCategoryIds((prev) => prev.filter((cId) => availableMainSet.has(cId)));
      setSelectedSubCategoryIds((prev) => prev.filter((sId) => availableSubSet.has(sId)));
    }
  };

  const toggleCategory = (id: string) => {
    const targetCat = categories.find((c) => c.id === id);
    const mainId = targetCat?.parentId || id;
    const isRemoving = selectedCategoryIds.includes(mainId);

    if (isRemoving) {
      setSelectedCategoryIds((prev) => prev.filter((c) => c !== mainId));
      setSelectedSubCategoryIds((prev) =>
        prev.filter((subId) => {
          const sub = categories.find((c) => c.id === subId);
          return sub?.parentId !== mainId;
        })
      );
    } else {
      setSelectedCategoryIds((prev) => [...prev, mainId]);
    }
  };

  const toggleSubCategory = (subId: string) => {
    const subCat = categories.find((c) => c.id === subId);
    if (subCat?.parentId && !selectedCategoryIds.includes(subCat.parentId)) {
      setSelectedCategoryIds((prev) => [...prev, subCat.parentId!]);
    }
    setSelectedSubCategoryIds((prev) =>
      prev.includes(subId) ? prev.filter((s) => s !== subId) : [...prev, subId]
    );
  };

  const crossFilter = computeCrossFilterAvailability({
    products,
    companies,
    categories,
    selectedCompanyIds,
    selectedCategoryIds,
    selectedSubCategoryIds,
  });

  // Filter Active Products (Supports multi-select Companies + Main/Sub Categories + Smart Search)
  const activeProducts = products.filter((p) => {
    if (!p.active) return false;

    const { mainCategory, subCategory } = getCategoryDisplayPath(
      p.categoryId,
      p.subCategoryId,
      categories
    );
    const categoryName = [mainCategory?.name, subCategory?.name].filter(Boolean).join(' ');
    const companyName = companies.find((c) => c.id === p.companyId)?.name || '';

    const matchesSearch =
      searchQuery === '' ||
      matchesProductSearch(p, searchQuery, {
        categoryName,
        companyName,
      });

    const matchesComp =
      selectedCompanyIds.length === 0 || selectedCompanyIds.includes(p.companyId);

    const matchesCat = productMatchesCategoryFilter(
      p,
      selectedCategoryIds,
      selectedSubCategoryIds,
      categories
    );

    return matchesSearch && matchesComp && matchesCat;
  });

  const resolvedShowcases = resolveHomeShowcases(settings, products);
  const activeShowcaseSection =
    settings.showHomeShowcases && selectedShowcaseKey
      ? resolvedShowcases.find((s) => s.key === selectedShowcaseKey) || null
      : null;
  const showcaseItemByProductId = new Map<string, HomeShowcaseItem>();
  if (activeShowcaseSection) {
    for (const it of activeShowcaseSection.items) {
      showcaseItemByProductId.set(it.productId, it);
    }
  }

  const displayedProducts = activeShowcaseSection
    ? activeShowcaseSection.items
        .map((it) => activeProducts.find((p) => p.id === it.productId))
        .filter((p): p is Product => Boolean(p))
    : activeProducts;

  // Add to basket handler
  const handleAddToCart = (
    product: Product,
    packageObj: Package,
    quantity: number,
    unit: 'piece' | 'carton' = 'piece',
    overrideUnitPrice?: number
  ) => {
    const company = companies.find((c) => c.id === product.companyId);
    const unitPrice =
      typeof overrideUnitPrice === 'number' && !isNaN(overrideUnitPrice)
        ? overrideUnitPrice
        : packageObj.price;
    const subtotal = unitPrice * quantity;

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      companyId: product.companyId,
      companyName: company ? company.name : 'كروپسا',
      packageId: packageObj.id,
      packageDisplayName: packageObj.displayName,
      unit: packageObj.unit,
      quantity,
      orderUnit: 'piece',
      piecesPerCarton: 1,
      piecesEquivalent: quantity,
      unitPrice,
      subtotal,
    };

    setBasketItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.productId === product.id && it.packageId === packageObj.id
      );
      if (existingIdx !== -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + quantity;
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          piecesEquivalent: newQty,
          subtotal: existing.unitPrice * newQty,
        };
        return updated;
      }
      return [...prev, newItem];
    });
    addToast(`تمت إضافة ${quantity} قطعة من "${product.name}" إلى الطلبية`, 'success');
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setBasketItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = {
        ...item,
        quantity: newQty,
        piecesEquivalent: newQty,
        subtotal: item.unitPrice * newQty,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setBasketItems((prev) => prev.filter((_, idx) => idx !== index));
    addToast('تم إزالة الصنف من السلة', 'info');
  };

  const handleClearBasket = () => {
    setBasketItems([]);
  };

  const handleOpenProductDetails = (product: Product, selectedPackage?: Package) => {
    setSelectedProductModal(product);
    setSelectedPackageModal(selectedPackage);
  };

  if (isFinancingPageOpen) {
    return (
      <IslamicFinancingPage
        settings={settings}
        basketItems={basketItems}
        onBackToCatalog={() => setIsFinancingPageOpen(false)}
        onSubmitFinancingRequest={async (payload) => {
          if (onSubmitFinancingRequest) {
            return onSubmitFinancingRequest(payload);
          }
          const now = new Date().toISOString();
          return {
            ...payload,
            id: 'FIN-' + Date.now(),
            requestNumber: 'FIN-' + Math.floor(100000 + Math.random() * 900000),
            status: 'new',
            createdAt: now,
            updatedAt: now,
          };
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-between font-sans dir-rtl text-stone-900">
      {/* 1. Noon / Amazon Style Sticky Header with Integrated Search */}
      <Header
        cartItemCount={basketItems.length}
        onOpenBasket={() => setIsBasketOpen(true)}
        onOpenAdmin={onOpenAdmin}
        onOpenIslamicFinancing={() => {
          setIsFinancingPageOpen(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isAdminLoggedIn={isAdminLoggedIn}
        currentUser={currentUser}
        hasDashboardAccess={hasDashboardAccess(currentUser)}
        canBuildCatalog={canBuildCustomCatalog(currentUser)}
        onOpenCatalogBuilder={onOpenCatalogBuilder}
        onOpenLogin={() => setIsEmployeeLoginOpen(true)}
        onLogout={() => {
          onLogout?.();
          addToast('تم تسجيل الخروج والعودة لوضع العميل العام', 'info');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        whatsAppNumber={settings.whatsApp}
        phone={settings.phone}
        onNavigateHome={() => {
          resetAllFilters();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 2. Main Noon / Amazon Storefront Body */}
      <main
        className={`max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-5 flex-1 w-full space-y-4 sm:space-y-6 ${
          basketItems.length > 0 ? 'pb-36 md:pb-20' : 'pb-24 md:pb-12'
        }`}
      >
        {/* Top Configurable Hero Banner (From Settings: Default Carousel / Text + Image / Full Image) */}
        {isHomeDefaultView && (
          <OffersBannerCarousel
            advertisements={advertisements}
            settings={settings}
            onSelectCategory={(catId) => {
              setSelectedCategoryIds([catId]);
            }}
            onOpenInstallmentInfo={() => setIsBasketOpen(true)}
          />
        )}

        {/* Instant Visual Entry Selector (Compact Companies Strip + Cross-Filtered Categories & Sub-Categories) */}
        <OnboardingBrowseSelector
          companiesMeta={crossFilter.visibleCompaniesMeta}
          totalActiveCompaniesCount={crossFilter.allCompaniesMeta.length}
          visibleMainCategories={crossFilter.visibleMainCategories}
          visibleSubCategories={crossFilter.visibleSubCategories}
          selectedCompanyIds={selectedCompanyIds}
          selectedCategoryIds={selectedCategoryIds}
          selectedSubCategoryIds={selectedSubCategoryIds}
          onToggleCompany={toggleCompany}
          onToggleCategory={toggleCategory}
          onToggleSubCategory={toggleSubCategory}
          onOpenAllCompanies={() => setIsCompanyDirectoryOpen(true)}
          onClearAll={resetAllFilters}
          matchingProductsCount={displayedProducts.length}
          hasCategoryRestrictionOnCompanies={crossFilter.hasCategoryRestrictionOnCompanies}
          hasCompanyRestrictionOnCategories={crossFilter.hasCompanyRestrictionOnCategories}
        />

        {/* Standalone 3-Tile Showcase Board (Hidden by default unless enabled in Dashboard Settings) */}
        {settings.showHomeShowcases && (
          <HomeShowcaseBoxes
            settings={settings}
            products={products}
            selectedShowcaseKey={selectedShowcaseKey}
            onSelectShowcase={setSelectedShowcaseKey}
          />
        )}

        {/* Quick Farmer Agricultural Search Tags */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-black text-stone-400 shrink-0">بحث سريع:</span>
          {[
            { label: '🐛 دودة وحشرات', q: 'دودة' },
            { label: '🍄 أعفان وفطريات', q: 'عفن' },
            { label: '🍅 طماطم', q: 'طماطم' },
            { label: '🥔 بطاطس', q: 'بطاطس' },
            { label: '🌱 تجذير', q: 'جذور' },
            { label: '🍎 تحجيم وتزهير', q: 'تحجيم' },
            { label: '💧 هيوميك', q: 'هيوميك' },
          ].map((tag) => {
            const isActive = searchQuery === tag.q;
            return (
              <button
                key={tag.q}
                type="button"
                onClick={() => setSearchQuery(isActive ? '' : tag.q)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                    : 'bg-white hover:bg-emerald-50 text-stone-700 border-stone-200'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>

        {/* Active Multi-Select Filters Banner */}
        {!isHomeDefaultView && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-3 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-stone-500">المختار حالياً:</span>
              {selectedCompanyIds.map((compId) => {
                const comp = companies.find((c) => c.id === compId);
                if (!comp) return null;
                return (
                  <span
                    key={compId}
                    className="inline-flex items-center gap-1 bg-stone-900 text-white font-black px-2.5 py-1 rounded-lg"
                  >
                    <span>شركة: {comp.name}</span>
                    <button onClick={() => toggleCompany(compId)} className="cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}

              {selectedCategoryIds.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                if (!cat) return null;
                return (
                  <span
                    key={catId}
                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 font-black px-2.5 py-1 rounded-lg border border-amber-300"
                  >
                    <span>قسم: {cat.name}</span>
                    <button onClick={() => toggleCategory(catId)} className="cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}

              {selectedSubCategoryIds.map((subId) => {
                const sub = categories.find((c) => c.id === subId);
                if (!sub) return null;
                return (
                  <span
                    key={subId}
                    className="inline-flex items-center gap-1 bg-emerald-100 text-[#046A47] font-black px-2.5 py-1 rounded-lg border border-emerald-300"
                  >
                    <span>فرعي: {sub.name}</span>
                    <button onClick={() => toggleSubCategory(subId)} className="cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}

              {activeShowcaseSection && (
                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 font-black px-2.5 py-1 rounded-lg">
                  <span>{activeShowcaseSection.title}</span>
                  <button onClick={() => setSelectedShowcaseKey(null)} className="cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-900 font-black px-2.5 py-1 rounded-lg">
                  <span>بحث: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-black text-rose-600 hover:underline cursor-pointer px-2"
            >
              إلغاء جميع الفلاتر
            </button>
          </motion.div>
        )}

        {/* 3. Main Products Grid Section */}
        <section id="catalog-products-section" className="space-y-3 scroll-mt-24">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center">
                <PackageCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-900">
                  {activeShowcaseSection
                    ? activeShowcaseSection.title
                    : isHomeDefaultView
                      ? 'جميع المنتجات الزراعية'
                      : 'المنتجات المطابقة'}
                </h2>
              </div>
            </div>

            <span className="text-xs font-black text-[#046A47] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {displayedProducts.length} منتج متاح
            </span>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="bg-white p-10 sm:p-14 rounded-3xl border border-stone-200 text-center space-y-3 my-4">
              <div className="w-16 h-16 bg-emerald-50 text-[#046A47] rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                لم نجد منتجات تطابق بحثك الحالي
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                جرب البحث بكلمة أبسط أو اضغط على الزر بالأسفل للعودة لجميع المنتجات.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-2 px-6 py-2.5 bg-[#046A47] text-white text-xs sm:text-sm font-black rounded-xl hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                عرض جميع الأصناف
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {displayedProducts.map((product) => {
                const company = companies.find((c) => c.id === product.companyId);
                const prodPackages = packages.filter((p) => p.productId === product.id && p.active);
                const showcaseItem = showcaseItemByProductId.get(product.id);
                const badgeLabel =
                  showcaseItem?.discountLabel?.trim() ||
                  (showcaseItem?.discountPercent && showcaseItem.discountPercent > 0
                    ? `خصم ${showcaseItem.discountPercent}%`
                    : undefined);

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    company={company}
                    packages={prodPackages}
                    onOpenDetails={handleOpenProductDetails}
                    onQuickAdd={handleAddToCart}
                    onRequestAdd={(prod, pkg, promoDiscountPercent, promoLabel) =>
                      setQuickAddTarget({ product: prod, pkg, promoDiscountPercent, promoLabel })
                    }
                    promoDiscountPercent={showcaseItem?.discountPercent}
                    promoBadgeLabel={badgeLabel}
                    promoNote={showcaseItem?.note}
                    showProductId={settings.showProductIds}
                    showPrices={settings.showPrices}
                    whatsAppNumber={settings.whatsApp}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Bottom Order Bar */}
      <FloatingOrderBar
        itemsCount={basketItems.length}
        totalAmount={totalBasketAmount}
        onOpenBasket={() => setIsBasketOpen(true)}
      />

      {/* Footer */}
      <Footer settings={settings} />

      {/* Product Detail Modal */}
      {(() => {
        const path = selectedProductModal
          ? getCategoryDisplayPath(
              selectedProductModal.categoryId,
              selectedProductModal.subCategoryId,
              categories
            )
          : {};
        return (
          <ProductModal
            product={selectedProductModal}
            company={companies.find((c) => c.id === selectedProductModal?.companyId)}
            category={path.mainCategory}
            subCategory={path.subCategory}
            packages={
              selectedProductModal ? packages.filter((p) => p.productId === selectedProductModal.id) : []
            }
            initialPackage={selectedPackageModal}
            onClose={() => setSelectedProductModal(null)}
            onAddToCart={handleAddToCart}
          />
        );
      })()}

      {/* Quick Add Quantity Modal */}
      <QuickAddQuantityModal
        isOpen={Boolean(quickAddTarget)}
        product={quickAddTarget?.product ?? null}
        company={companies.find((c) => c.id === quickAddTarget?.product.companyId)}
        packages={
          quickAddTarget
            ? packages.filter((p) => p.productId === quickAddTarget.product.id && p.active)
            : []
        }
        initialPackage={quickAddTarget?.pkg}
        promoDiscountPercent={quickAddTarget?.promoDiscountPercent}
        promoLabel={quickAddTarget?.promoLabel}
        showPrices={settings.showPrices}
        onClose={() => setQuickAddTarget(null)}
        onConfirmAdd={(prod, pkg, qty, overrideUnitPrice) =>
          handleAddToCart(prod, pkg, qty, 'piece', overrideUnitPrice)
        }
      />

      {/* Cart & Checkout Drawer */}
      <BasketDrawer
        isOpen={isBasketOpen}
        onClose={() => setIsBasketOpen(false)}
        items={basketItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearBasket={handleClearBasket}
        onSubmitOrder={onSubmitOrder}
        whatsAppNumber={settings.whatsApp}
        currentUser={currentUser}
      />

      {/* Company Directory Modal */}
      <CompanyDirectoryModal
        isOpen={isCompanyDirectoryOpen}
        onClose={() => setIsCompanyDirectoryOpen(false)}
        companies={companies}
        companiesMeta={crossFilter.allCompaniesMeta}
        products={products}
        packages={packages}
        selectedCompanyIds={selectedCompanyIds}
        onToggleCompany={toggleCompany}
        onClearCompanies={() => setSelectedCompanyIds([])}
        onOpenProductDetails={handleOpenProductDetails}
        onQuickAdd={handleAddToCart}
        hasCategoryRestrictionOnCompanies={crossFilter.hasCategoryRestrictionOnCompanies}
        matchingProductsCount={displayedProducts.length}
      />

      {/* Mobile Bottom-Bar Sheet Drawer (Companies Picker / Categories Picker) */}
      <AnimatePresence>
        {mobileSheetMode !== 'closed' && (
          <div className="fixed inset-0 z-50 md:hidden dir-rtl flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSheetMode('closed')}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white rounded-t-3xl max-h-[82vh] flex flex-col overflow-hidden shadow-2xl border-t border-stone-200"
            >
              {/* Sheet Header */}
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-2">
                  {mobileSheetMode === 'companies' ? (
                    <Building2 className="w-5 h-5 text-[#046A47]" />
                  ) : (
                    <Layers className="w-5 h-5 text-amber-600" />
                  )}
                  <div>
                    <h3 className="text-sm font-black text-stone-900">
                      {mobileSheetMode === 'companies' ? 'اختر الشركات لعرض منتجاتها' : 'اختر الأقسام لعرض منتجاتها'}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-medium">
                      يمكنك تحديد أكثر من خيار في نفس الوقت
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSheetMode('closed')}
                  className="p-2 bg-stone-200/70 hover:bg-stone-300 rounded-full text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet Body */}
              <div className="p-4 overflow-y-auto flex-1">
                <OnboardingBrowseSelector
                  viewMode={mobileSheetMode === 'companies' ? 'by_company' : 'by_category'}
                  companiesMeta={crossFilter.visibleCompaniesMeta}
                  totalActiveCompaniesCount={crossFilter.allCompaniesMeta.length}
                  visibleMainCategories={crossFilter.visibleMainCategories}
                  visibleSubCategories={crossFilter.visibleSubCategories}
                  selectedCompanyIds={selectedCompanyIds}
                  selectedCategoryIds={selectedCategoryIds}
                  selectedSubCategoryIds={selectedSubCategoryIds}
                  onToggleCompany={toggleCompany}
                  onToggleCategory={toggleCategory}
                  onToggleSubCategory={toggleSubCategory}
                  onOpenAllCompanies={() => {
                    setMobileSheetMode('closed');
                    setIsCompanyDirectoryOpen(true);
                  }}
                  onClearAll={resetAllFilters}
                  matchingProductsCount={displayedProducts.length}
                  hasCategoryRestrictionOnCompanies={crossFilter.hasCategoryRestrictionOnCompanies}
                  hasCompanyRestrictionOnCategories={crossFilter.hasCompanyRestrictionOnCategories}
                  compactModalMode
                />
              </div>

              {/* Sheet Bottom Action */}
              <div className="p-3 border-t border-stone-200 bg-white flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSheetMode('closed');
                    setTimeout(() => {
                      const el = document.getElementById('catalog-products-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                  }}
                  className="flex-1 h-11 bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>عرض المنتجات ({activeProducts.length} منتج)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Mobile Bottom Dock (Sleek Checkout Strip + 5-Tab Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden dir-rtl shadow-[0_-6px_24px_rgba(0,0,0,0.08)]">
        {basketItems.length > 0 && (
          <div className="bg-[#046A47] text-white px-3 py-2 flex items-center justify-between gap-2 border-t border-emerald-500/40">
            <div className="flex items-center gap-2 min-w-0">
              <span className="bg-white/15 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0">
                {basketItems.reduce((acc, i) => acc + i.quantity, 0)} قطعة
              </span>
              <span className="text-sm font-black truncate">
                {Number(totalBasketAmount || 0).toLocaleString('en-US')}{' '}
                <span className="text-[10px] font-bold text-emerald-100">ج.م</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileSheetMode('closed');
                setIsBasketOpen(true);
              }}
              className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black px-3.5 py-1.5 rounded-xl text-xs shadow-xs active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              <span>إتمام الطلب والفاتورة</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-white/98 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 flex items-center justify-around">
          <button
            type="button"
            onClick={() => {
              setMobileSheetMode('closed');
              resetAllFilters();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer px-2 py-0.5 rounded-xl transition-colors ${
              isHomeDefaultView && mobileSheetMode === 'closed'
                ? 'text-[#046A47] font-black'
                : 'text-stone-600 font-bold'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">الرئيسية</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileSheetMode(mobileSheetMode === 'companies' ? 'closed' : 'companies')
            }
            className={`relative flex flex-col items-center gap-0.5 cursor-pointer px-2 py-0.5 rounded-xl transition-colors ${
              mobileSheetMode === 'companies' || selectedCompanyIds.length > 0
                ? 'text-[#046A47] font-black'
                : 'text-stone-600 font-bold'
            }`}
          >
            <div className="relative">
              <Building2 className="w-5 h-5" />
              {selectedCompanyIds.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#046A47] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {selectedCompanyIds.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">الشركات</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMobileSheetMode(mobileSheetMode === 'categories' ? 'closed' : 'categories')
            }
            className={`relative flex flex-col items-center gap-0.5 cursor-pointer px-2 py-0.5 rounded-xl transition-colors ${
              mobileSheetMode === 'categories' ||
              selectedCategoryIds.length + selectedSubCategoryIds.length > 0
                ? 'text-amber-600 font-black'
                : 'text-stone-600 font-bold'
            }`}
          >
            <div className="relative">
              <Layers className="w-5 h-5" />
              {selectedCategoryIds.length + selectedSubCategoryIds.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-500 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {selectedCategoryIds.length + selectedSubCategoryIds.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">الأقسام</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileSheetMode('closed');
              setIsBasketOpen(true);
            }}
            className="relative flex flex-col items-center gap-0.5 text-stone-600 hover:text-[#046A47] cursor-pointer px-2 py-0.5"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-[#046A47]" />
              {basketItems.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-400 text-stone-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {basketItems.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-[#046A47]">السلة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileSheetMode('closed');
              setIsFinancingPageOpen(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center gap-0.5 text-[#046A47] hover:text-emerald-900 cursor-pointer px-1.5 py-0.5"
          >
            <Banknote className="w-5 h-5 text-[#046A47]" />
            <span className="text-[10px] font-black whitespace-nowrap">تمويل إسلامي</span>
          </button>
        </div>
      </div>

      {/* Employee In-Catalog Login Modal */}
      <EmployeeLoginModal
        isOpen={isEmployeeLoginOpen}
        onClose={() => setIsEmployeeLoginOpen(false)}
        onLogin={(usernameOrEmail, password) => {
          if (!onEmployeeLogin) {
            return { success: false, error: 'نظام تسجيل الدخول غير متاح.' };
          }
          const res = onEmployeeLogin(usernameOrEmail, password);
          if (res.success && res.user) {
            addToast(
              `أهلاً ${res.user.name} — تم تفعيل صلاحيات (${ROLE_METADATA[res.user.role]?.shortLabel || 'موظف'})`,
              'success'
            );
          }
          return res;
        }}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};
