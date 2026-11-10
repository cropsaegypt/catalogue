import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Building2,
  MessageCircle,
  Search,
  X,
  ArrowRight,
  UserCheck,
  Package as PackageIcon,
} from 'lucide-react';
import {
  SharedCustomCatalog,
  Product,
  Package,
  OrderItem,
  Order,
  TeamMember,
} from '../../types';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { QuickAddQuantityModal } from './QuickAddQuantityModal';
import { BasketDrawer } from './BasketDrawer';
import { ToastContainer, ToastMessage } from '../common/Toast';

interface SharedCatalogViewProps {
  catalog: SharedCustomCatalog;
  currentUser?: TeamMember | null;
  onSubmitOrder: (customerData: any) => Promise<Order | any>;
  onOpenFullStore: () => void;
}

export const SharedCatalogView: React.FC<SharedCatalogViewProps> = ({
  catalog,
  currentUser = null,
  onSubmitOrder,
  onOpenFullStore,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [basketItems, setBasketItems] = useState<OrderItem[]>([]);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [selectedPackageModal, setSelectedPackageModal] = useState<Package | undefined>(undefined);
  const [quickAddTarget, setQuickAddTarget] = useState<{ product: Product; pkg?: Package } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev.slice(-1), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  };

  const companiesInCatalog = useMemo(() => {
    const usedIds = new Set(catalog.productsSnapshot.map((p) => p.companyId));
    return catalog.companiesSnapshot.filter((c) => usedIds.has(c.id));
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    return catalog.productsSnapshot.filter((p) => {
      const matchesCompany = selectedCompanyId === 'ALL' || p.companyId === selectedCompanyId;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCompany && matchesSearch;
    });
  }, [catalog.productsSnapshot, selectedCompanyId, searchQuery]);

  const handleAddToCart = (
    product: Product,
    packageObj: Package,
    quantity: number
  ) => {
    const company = catalog.companiesSnapshot.find((c) => c.id === product.companyId);
    const unitPrice = packageObj.price;

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
      subtotal: unitPrice * quantity,
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
      setBasketItems((prev) => prev.filter((_, idx) => idx !== index));
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

  const totalBasketAmount = basketItems.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
  const totalBasketPieces = basketItems.reduce((acc, item) => acc + item.quantity, 0);
  const cleanWa = (catalog.settingsSnapshot.whatsApp || '201000000000').replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-[#F7F8FA] dir-rtl text-stone-900 flex flex-col justify-between pb-24">
      {/* Top Sticky Minimal VIP Header */}
      <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-stone-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#046A47] to-[#024A31] rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0">
              🌱
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-xl font-black text-[#046A47]">CROPSA</span>
                <span className="bg-amber-400 text-stone-950 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                  كتالوج خاص
                </span>
              </div>
              <p className="text-[11px] font-bold text-stone-600 truncate">
                {catalog.clientName ? `مُعدّ خصيصاً لـ: ${catalog.clientName}` : 'عروض ومنتجات مختارة لك'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={`https://wa.me/${cleanWa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-2.5 sm:px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] border border-[#25D366]/30 rounded-xl text-xs font-black flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span className="hidden sm:inline">تواصل واتساب</span>
            </a>

            <button
              type="button"
              onClick={() => setIsBasketOpen(true)}
              className="h-9 px-3 sm:px-4 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span>السلة</span>
              <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-1.5 rounded-full">
                {basketItems.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-5 py-4 sm:py-6 flex-1 w-full space-y-5">
        {/* Welcome Client Card */}
        <div className="bg-gradient-to-r from-[#046A47] via-[#035539] to-[#023E29] text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-amber-400 text-stone-950 text-[11px] font-black px-3 py-0.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>كتالوج منتجات مخصص</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black leading-snug">
              {catalog.clientName ? `أهلاً بك يا ${catalog.clientName}` : 'أهلاً بك في كتالوج كروپسا الخاص بك'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100 font-bold">
              <span className="flex items-center gap-1">
                <PackageIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>{catalog.productsSnapshot.length} منتج مختار</span>
              </span>
              {catalog.createdByName && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>إعداد: {catalog.createdByName}</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenFullStore}
            className="self-start sm:self-center bg-white/15 hover:bg-white/25 text-white border border-white/25 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>تصفح المتجر الكامل</span>
          </button>
        </div>

        {/* Company Chips + Quick Search */}
        {(companiesInCatalog.length > 1 || catalog.productsSnapshot.length > 6) && (
          <div className="bg-white rounded-2xl border border-stone-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {companiesInCatalog.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedCompanyId('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border transition-all cursor-pointer ${
                    selectedCompanyId === 'ALL'
                      ? 'bg-[#046A47] text-white border-[#046A47]'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                  }`}
                >
                  الكل ({catalog.productsSnapshot.length})
                </button>
                {companiesInCatalog.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCompanyId(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 border flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedCompanyId === c.id
                        ? 'bg-[#046A47] text-white border-[#046A47]'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}

            {catalog.productsSnapshot.length > 4 && (
              <div className="relative sm:w-64 shrink-0">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث داخل هذا الكتالوج..."
                  className="w-full h-9 pr-9 pl-8 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#046A47]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filtered Custom Catalog Products */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const company = catalog.companiesSnapshot.find((c) => c.id === product.companyId);
            const prodPackages = catalog.packagesSnapshot.filter(
              (pkg) => pkg.productId === product.id && pkg.active
            );

            return (
              <ProductCard
                key={product.id}
                product={product}
                company={company}
                packages={prodPackages}
                onOpenDetails={(prod, pkg) => {
                  setSelectedProductModal(prod);
                  setSelectedPackageModal(pkg);
                }}
                onQuickAdd={(prod, pkg, qty) => handleAddToCart(prod, pkg, qty)}
                onRequestAdd={(prod, pkg) => setQuickAddTarget({ product: prod, pkg })}
                showProductId={true}
                showPrices={catalog.displayOptions.showPrices}
                whatsAppNumber={catalog.settingsSnapshot.whatsApp}
              />
            );
          })}
        </div>
      </main>

      {/* Bottom Sticky Order Summary when Cart has items */}
      {basketItems.length > 0 && (
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-40">
          <div className="bg-stone-950/95 text-white rounded-2xl px-4 py-2.5 shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-3 backdrop-blur-md">
            <div>
              <span className="text-[11px] text-emerald-300 font-bold block">
                {totalBasketPieces} قطعة في طلبيتك
              </span>
              <span className="text-base font-black">
                {Number(totalBasketAmount || 0).toLocaleString('en-US')} جنيه مصري
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsBasketOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm"
            >
              إتمام الطلبية ←
            </button>
          </div>
        </div>
      )}

      {/* Modals & Basket */}
      <ProductModal
        product={selectedProductModal}
        company={catalog.companiesSnapshot.find((c) => c.id === selectedProductModal?.companyId)}
        category={catalog.categoriesSnapshot.find((c) => c.id === selectedProductModal?.categoryId)}
        packages={
          selectedProductModal
            ? catalog.packagesSnapshot.filter((p) => p.productId === selectedProductModal.id)
            : []
        }
        initialPackage={selectedPackageModal}
        onClose={() => setSelectedProductModal(null)}
        onAddToCart={(prod, pkg, qty) => handleAddToCart(prod, pkg, qty)}
      />

      <QuickAddQuantityModal
        isOpen={Boolean(quickAddTarget)}
        product={quickAddTarget?.product ?? null}
        company={catalog.companiesSnapshot.find(
          (c) => c.id === quickAddTarget?.product.companyId
        )}
        packages={
          quickAddTarget
            ? catalog.packagesSnapshot.filter(
                (p) => p.productId === quickAddTarget.product.id && p.active
              )
            : []
        }
        initialPackage={quickAddTarget?.pkg}
        showPrices={catalog.displayOptions.showPrices}
        onClose={() => setQuickAddTarget(null)}
        onConfirmAdd={(prod, pkg, qty) => handleAddToCart(prod, pkg, qty)}
      />

      <BasketDrawer
        isOpen={isBasketOpen}
        onClose={() => setIsBasketOpen(false)}
        items={basketItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={(idx) => setBasketItems((prev) => prev.filter((_, i) => i !== idx))}
        onClearBasket={() => setBasketItems([])}
        onSubmitOrder={onSubmitOrder}
        whatsAppNumber={catalog.settingsSnapshot.whatsApp}
        currentUser={currentUser}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};
