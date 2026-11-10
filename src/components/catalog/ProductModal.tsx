import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  CheckCircle2,
  ShoppingBag,
  Plus,
  Minus,
  Package as PackageIcon,
  Info,
  Sparkles,
  Building2,
  Layers,
  ZoomIn,
} from 'lucide-react';
import { Product, Package, Company, Category } from '../../types';
import { ImageZoomModal } from '../common/ImageZoomModal';

interface ProductModalProps {
  product: Product | null;
  company?: Company;
  category?: Category;
  packages: Package[];
  initialPackage?: Package;
  onClose: () => void;
  onAddToCart: (
    product: Product,
    packageObj: Package,
    quantity: number,
    unit: 'piece' | 'carton'
  ) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  company,
  category,
  packages,
  initialPackage,
  onClose,
  onAddToCart,
}) => {
  const activePackages = packages.filter((p) => p.active);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [quantityText, setQuantityText] = useState<string>('1');
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (product) {
      const active = packages.filter((p) => p.active);
      const def =
        initialPackage && initialPackage.active ? initialPackage : active[0];
      setSelectedPackageId(def ? def.id : '');
      setQuantityText('1');
      setActiveImageIndex(0);
    }
  }, [product, initialPackage, packages]);

  if (!product) return null;

  const productImages = [
    product.mainImageUrl ||
      'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=800&auto=format&fit=crop&q=80',
    ...(product.galleryImageIds || []),
  ].filter(Boolean);

  const currentImage = productImages[activeImageIndex] || productImages[0];
  const currentPackage =
    activePackages.find((p) => p.id === selectedPackageId) || activePackages[0];

  const numericQty = Math.max(1, parseInt(quantityText, 10) || 1);
  const unitPrice = currentPackage ? currentPackage.price : 0;
  const totalPrice = unitPrice * numericQty;

  const handleStep = (delta: number) => {
    setQuantityText(String(Math.max(1, numericQty + delta)));
  };

  const handleAddToCart = () => {
    if (currentPackage) {
      onAddToCart(product, currentPackage, numericQty, 'piece');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs dir-rtl animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-stone-200 flex flex-col justify-between">
        {/* Clean Modern Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200/80 flex items-start justify-between gap-3 bg-white sticky top-0 z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-stone-900 text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                {product.id}
              </span>
              {category && (
                <span className="text-[11px] font-black text-[#046A47] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {category.name}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-stone-900 leading-tight">
              {product.name}
            </h2>
            <div className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg text-xs font-bold text-stone-700">
              <Building2 className="w-3.5 h-3.5 text-[#046A47]" />
              <span>إنتاج وتوزيع شركة: {company?.name || 'كروپسا'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Section: Image + Immediate Package & Quantity Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Image Box */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 flex flex-col items-center justify-center relative group">
              <div
                onClick={() => setIsZoomOpen(true)}
                className="relative w-full h-56 sm:h-64 flex items-center justify-center cursor-pointer overflow-hidden rounded-xl bg-white p-2 border border-stone-100"
              >
                <img
                  src={currentImage}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-2 left-2 bg-white/95 text-[#046A47] text-[11px] font-black px-2.5 py-1 rounded-xl shadow-sm border border-stone-200 flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>تكبير</span>
                </div>
              </div>

              {productImages.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto max-w-full p-1">
                  {productImages.map((imgUrl, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-12 h-12 rounded-xl border-2 overflow-hidden bg-white p-0.5 shrink-0 transition-all cursor-pointer ${
                        idx === activeImageIndex
                          ? 'border-[#046A47] ring-2 ring-emerald-300'
                          : 'border-stone-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Package Size & "عايز كام قطعة؟" Quantity Selector */}
            <div className="space-y-4">
              {/* 1. Package Sizes */}
              {activePackages.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-black text-stone-800 flex items-center gap-1.5">
                    <PackageIcon className="w-4 h-4 text-[#046A47]" />
                    <span>١. اختر حجم العبوة:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {activePackages.map((pkg) => {
                      const isSelected = pkg.id === currentPackage?.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={`p-3 rounded-2xl border-2 text-right transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-[#046A47] ring-2 ring-emerald-500/15 shadow-xs'
                              : 'bg-white border-stone-200 hover:border-emerald-300'
                          }`}
                        >
                          <div>
                            <span className="font-black text-sm text-stone-900 block">
                              {pkg.displayName}
                            </span>
                            <span className="text-xs font-extrabold text-[#046A47] mt-0.5 block">
                              {Number(pkg.price).toLocaleString('en-US')} {pkg.currency || 'ج.م'}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-[#046A47] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. Editable Quantity Picker ("عايز كام قطعة؟") */}
              {currentPackage && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-stone-900">٢. عايز كام قطعة؟</span>
                    <span className="text-[11px] font-bold text-stone-500">
                      + / - أو اكتب العدد
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2.5">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleStep(-1)}
                      disabled={numericQty <= 1}
                      className="w-12 h-12 bg-white border-2 border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-900 rounded-2xl flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      title="إنقاص"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </motion.button>

                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={9999}
                      value={quantityText}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setQuantityText(val);
                      }}
                      onBlur={() => {
                        if (!quantityText || parseInt(quantityText, 10) < 1) {
                          setQuantityText('1');
                        }
                      }}
                      className="w-24 h-12 text-center text-2xl font-black text-[#046A47] bg-white border-2 border-[#046A47] rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                    />

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleStep(1)}
                      className="w-12 h-12 bg-[#046A47] hover:bg-[#035237] text-white border-2 border-[#046A47] rounded-2xl flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                      title="زيادة"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </motion.button>
                  </div>

                  {/* Quick 1-Tap Quantity Presets */}
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 3, 5, 10, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantityText(String(preset))}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          numericQty === preset
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Description */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70">
                <span className="text-[11px] font-black text-stone-400 block mb-1">
                  نبذة عن المنتج:
                </span>
                <p className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed">
                  {product.description || product.shortDescription}
                </p>
              </div>
            </div>
          </div>

          {/* Technical Details Section (Below Action Controls) */}
          <div className="space-y-3 pt-4 border-t border-stone-200">
            {product.characteristics && product.characteristics.length > 0 && (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>الخصائص المميزة والفوائد:</span>
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700 font-medium">
                  {product.characteristics.map((char, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#046A47] shrink-0 mt-0.5" />
                      <span>{char}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.composition && product.composition.length > 0 && (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-[#046A47]" />
                  <span>التركيب الكيميائي:</span>
                </h4>
                <ul className="list-disc list-inside text-xs text-stone-700 font-medium space-y-1">
                  {product.composition.map((comp, index) => (
                    <li key={index}>{comp}</li>
                  ))}
                </ul>
              </div>
            )}

            {product.usage && product.usage.length > 0 && (
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-sky-600" />
                  <span>معدلات الاستخدام والتطبيق:</span>
                </h4>
                <ul className="list-disc list-inside text-xs text-stone-700 font-medium space-y-1">
                  {product.usage.map((use, index) => (
                    <li key={index}>{use}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Crisp Sticky Footer */}
        <div className="p-4 border-t border-stone-200 bg-white flex items-center justify-between gap-3">
          <div className="shrink-0">
            <span className="text-[11px] font-bold text-stone-500 block">
              الإجمالي ({numericQty} قطعة):
            </span>
            <span className="text-lg sm:text-xl font-black text-[#046A47]">
              {Number(totalPrice).toLocaleString('en-US')}{' '}
              <span className="text-xs font-bold text-stone-600">
                {currentPackage?.currency || 'ج.م'}
              </span>
            </span>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            disabled={!currentPackage}
            className="flex-1 max-w-md h-12 sm:h-14 bg-[#046A47] hover:bg-[#035237] disabled:opacity-50 text-white px-5 rounded-2xl text-sm sm:text-base font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <span>أضف للطلبية الآن</span>
          </motion.button>
        </div>
      </div>

      <ImageZoomModal
        isOpen={isZoomOpen}
        images={productImages}
        initialIndex={activeImageIndex}
        title={`معاينة صورة: ${product.name}`}
        onClose={() => setIsZoomOpen(false)}
      />
    </div>
  );
};
