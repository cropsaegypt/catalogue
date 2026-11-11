import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag,
  ZoomIn,
  Plus,
  CheckCircle2,
  MessageCircle,
  Truck,
  Building2,
} from 'lucide-react';
import { Product, Package, Company } from '../../types';
import { FALLBACK_BOTTLE_SVG_DATA_URL } from '../../utils/agriculturalImages';
import { ImageZoomModal } from '../common/ImageZoomModal';

interface ProductCardProps {
  product: Product;
  company?: Company;
  packages: Package[];
  onOpenDetails: (product: Product, selectedPackage?: Package) => void;
  onQuickAdd: (product: Product, packageObj: Package, quantity: number, unit?: 'piece' | 'carton') => void;
  onRequestAdd?: (
    product: Product,
    selectedPackage?: Package,
    promoDiscountPercent?: number,
    promoLabel?: string
  ) => void;
  promoDiscountPercent?: number;
  promoBadgeLabel?: string;
  promoNote?: string;
  showProductId?: boolean;
  showPrices?: boolean;
  whatsAppNumber?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  company,
  packages,
  onOpenDetails,
  onQuickAdd,
  onRequestAdd,
  promoDiscountPercent = 0,
  promoBadgeLabel,
  promoNote,
  showProductId = true,
  showPrices = true,
  whatsAppNumber = '201000000000',
}) => {
  const activePackages = packages.filter((p) => p.active);
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    activePackages.length > 0 ? activePackages[0].id : ''
  );
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [isAddedRecently, setIsAddedRecently] = useState<boolean>(false);

  const currentPackage = activePackages.find((p) => p.id === selectedPackageId) || activePackages[0];

  const productImages = [
    product.mainImageUrl ||
      'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=600&auto=format&fit=crop&q=80',
    ...(product.galleryImageIds || []),
  ].filter(Boolean);

  const pct = Math.max(0, Math.min(95, Number(promoDiscountPercent) || 0));
  const finalUnitPrice =
    currentPackage && pct > 0 ? Math.round(currentPackage.price * (1 - pct / 100)) : currentPackage?.price ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentPackage) return;
    if (onRequestAdd) {
      onRequestAdd(
        product,
        currentPackage,
        pct > 0 ? pct : undefined,
        promoBadgeLabel || (pct > 0 ? `خصم ${pct}%` : undefined)
      );
      return;
    }
    onQuickAdd(product, currentPackage, 1, 'piece');
    setIsAddedRecently(true);
    setTimeout(() => setIsAddedRecently(false), 1200);
  };

  const handleWhatsAppOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = (whatsAppNumber || '201000000000').replace(/[^0-9]/g, '');
    const pkgName = currentPackage ? currentPackage.displayName : 'العبوة القياسية';
    const priceText = currentPackage && showPrices ? `${currentPackage.price} جنيه` : 'حسب السعر الحالي';
    const compName = company ? `\nالشركة: *${company.name}*` : '';

    const message = `السلام عليكم،\nمحتاج أطلب منتج: *${product.name}*${compName}\nالعبوة: *${pkgName}*\nالسعر: *${priceText}*\nكود الصنف: ${product.id}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getTag = () => {
    if (product.featured) {
      return (
        <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-2xs">
          عرض مميز 🔥
        </span>
      );
    }
    if (product.productType === 'pesticide') {
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-lg">
          مبيد معتمد
        </span>
      );
    }
    if (product.productType === 'stimulant') {
      return (
        <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-black px-2 py-0.5 rounded-lg">
          مخصب سائل
        </span>
      );
    }
    return (
      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-lg">
        سماد ومغذي
      </span>
    );
  };

  const rawImg = product.mainImageUrl || '';
  const imgSrc =
    !rawImg || rawImg.includes('photo-1592417817098-8f3d6ef23a81')
      ? FALLBACK_BOTTLE_SVG_DATA_URL
      : rawImg;
  const isPackImage =
    imgSrc.startsWith('/uploads/') ||
    imgSrc.startsWith('data:image') ||
    imgSrc.includes('firebasestorage');

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={() => onOpenDetails(product, currentPackage)}
      className="group bg-white rounded-2xl border border-stone-200/75 hover:border-[#046A47] shadow-2xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between overflow-hidden p-2 sm:p-3 dir-rtl cursor-pointer h-full"
    >
      {/* 1. Crisp Decluttered Image Box */}
      <div
        className={`relative w-full aspect-[4/3] sm:aspect-square rounded-xl flex items-center justify-center overflow-hidden mb-2.5 ${
          isPackImage ? 'bg-white border border-stone-100 p-2' : 'bg-stone-100'
        }`}
      >
        {/* Top-Right Type Badge */}
        <div className="absolute top-1.5 right-1.5 z-10">{getTag()}</div>

        {/* Top-Left Promo Discount Ribbon when viewed from a showcase offer */}
        {(promoBadgeLabel || pct > 0) && (
          <div className="absolute top-1.5 left-1.5 z-10 bg-rose-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-lg shadow-xs max-w-[55%] truncate">
            {promoBadgeLabel || `خصم ${pct}%`}
          </div>
        )}

        {/* Desktop-only Hover Zoom Icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomOpen(true);
          }}
          className="hidden sm:flex opacity-0 group-hover:opacity-100 absolute top-2 left-2 z-10 w-7 h-7 bg-white/95 hover:bg-[#046A47] text-stone-600 hover:text-white rounded-full shadow-xs border border-stone-200 items-center justify-center transition-all cursor-pointer"
          title="تكبير الصورة"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {/* Product Image */}
        <img
          src={imgSrc}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BOTTLE_SVG_DATA_URL;
          }}
          className={`w-full h-full group-hover:scale-105 transition-transform duration-300 ${
            isPackImage ? 'object-contain' : 'object-cover'
          }`}
          loading="lazy"
        />

        {/* Quick "+" Add Button on Bottom-Left */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={handleAdd}
          disabled={!currentPackage}
          className={`absolute bottom-1.5 left-1.5 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full shadow-md flex items-center justify-center transition-all cursor-pointer border ${
            isAddedRecently
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'bg-white/95 text-stone-900 border-stone-200 hover:bg-[#046A47] hover:text-white hover:border-[#046A47]'
          }`}
          title="إضافة سريعة للسلة"
        >
          {isAddedRecently ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 font-black" />
          )}
        </motion.button>
      </div>

      {/* 2. Product Details */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1.5">
          {/* Clean Bold 2-line Title */}
          <h3
            className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-[#046A47] transition-colors line-clamp-2 min-h-[2.2rem] leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Company Pill + Subtle Product Code */}
          <div className="flex items-center justify-between gap-1">
            <div className="inline-flex items-center gap-1 bg-stone-100/90 border border-stone-200/80 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold text-stone-700 min-w-0">
              {company?.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-3.5 h-3.5 object-contain rounded-full shrink-0"
                />
              ) : (
                <Building2 className="w-3 h-3 text-[#046A47] shrink-0" />
              )}
              <span className="truncate">{company?.name || 'كروپسا'}</span>
            </div>

            {showProductId && (
              <span className="font-mono text-[9px] font-bold text-stone-400 shrink-0">
                {product.id}
              </span>
            )}
          </div>

          {/* Compact Package Size Pills */}
          {activePackages.length > 0 && (
            <div
              className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none pt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {activePackages.map((pkg) => {
                const isSelected = pkg.id === currentPackage?.id;
                return (
                  <button
                    type="button"
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {pkg.displayName}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Price & Fast Actions */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          {promoNote && (
            <div className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg line-clamp-1">
              {promoNote}
            </div>
          )}

          {/* Price Row */}
          <div className="flex items-center justify-between gap-1">
            {showPrices && currentPackage ? (
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className={`text-base sm:text-lg font-black ${pct > 0 ? 'text-rose-700' : 'text-stone-950'}`}>
                  {Number(finalUnitPrice).toLocaleString('en-US')}
                </span>
                <span className="text-[11px] font-bold text-stone-600">
                  {currentPackage.currency || 'ج.م'}
                </span>
                {pct > 0 && (
                  <span className="text-[10.5px] font-bold text-stone-400 line-through">
                    {Number(currentPackage.price).toLocaleString('en-US')}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-bold text-stone-400">السعر عند الطلب</span>
            )}

            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <Truck className="w-3 h-3" />
              <span>توصيل سريع</span>
            </span>
          </div>

          {/* Primary: Add to Order + Secondary Compact WhatsApp */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={handleAdd}
              disabled={!currentPackage}
              className={`flex-1 h-9 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                isAddedRecently
                  ? 'bg-emerald-800 text-white'
                  : 'bg-[#046A47] hover:bg-[#035237] text-white'
              }`}
              title="أضف للطلبية"
            >
              {isAddedRecently ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>تمت الإضافة!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                  <span>أضف للطلبية</span>
                </>
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={handleWhatsAppOrder}
              className="w-9 h-9 shrink-0 bg-[#25D366]/12 hover:bg-[#25D366] text-[#075E54] hover:text-white border border-[#25D366]/35 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              title="طلب سريع عبر الواتساب"
            >
              <MessageCircle className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Image Zoom Lightbox */}
      <ImageZoomModal
        isOpen={isZoomOpen}
        images={productImages}
        title={`صورة: ${product.name}`}
        onClose={() => setIsZoomOpen(false)}
      />
    </motion.div>
  );
};
