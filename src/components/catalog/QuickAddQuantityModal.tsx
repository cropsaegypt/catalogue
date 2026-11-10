import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  Building2,
  Package as PackageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Product, Package, Company } from '../../types';

interface QuickAddQuantityModalProps {
  isOpen: boolean;
  product: Product | null;
  company?: Company;
  packages: Package[];
  initialPackage?: Package;
  showPrices?: boolean;
  onClose: () => void;
  onConfirmAdd: (product: Product, packageObj: Package, quantity: number) => void;
}

export const QuickAddQuantityModal: React.FC<QuickAddQuantityModalProps> = ({
  isOpen,
  product,
  company,
  packages,
  initialPackage,
  showPrices = true,
  onClose,
  onConfirmAdd,
}) => {
  const activePackages = packages.filter((p) => p.active);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [quantityText, setQuantityText] = useState<string>('1');

  useEffect(() => {
    if (isOpen && product) {
      const defPkg =
        initialPackage && initialPackage.active
          ? initialPackage
          : activePackages[0];
      setSelectedPackageId(defPkg ? defPkg.id : '');
      setQuantityText('1');
    }
  }, [isOpen, product, initialPackage]);

  if (!isOpen || !product) return null;

  const currentPackage =
    activePackages.find((p) => p.id === selectedPackageId) || activePackages[0];

  const numericQty = Math.max(1, parseInt(quantityText, 10) || 1);
  const unitPrice = currentPackage ? currentPackage.price : 0;
  const totalPrice = unitPrice * numericQty;

  const handleStep = (delta: number) => {
    const next = Math.max(1, numericQty + delta);
    setQuantityText(String(next));
  };

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPackage) return;
    onConfirmAdd(product, currentPackage, numericQty);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Sheet / Modal Card */}
        <motion.form
          onSubmit={handleConfirm}
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
        >
          {/* Top Product Identity Strip */}
          <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200/80 flex items-center gap-3.5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-stone-200 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
              <img
                src={
                  product.mainImageUrl ||
                  'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=400&auto=format&fit=crop&q=80'
                }
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug line-clamp-2">
                {product.name}
              </h3>
              <div className="inline-flex items-center gap-1.5 bg-white border border-stone-200 px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-stone-700">
                <Building2 className="w-3.5 h-3.5 text-[#046A47]" />
                <span>شركة: {company?.name || 'كروپسا'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white hover:bg-stone-200 text-stone-600 rounded-full border border-stone-200 transition-colors cursor-pointer self-start"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Step 1: Package Size Selector (if available) */}
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
                        type="button"
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-[#046A47] ring-2 ring-emerald-500/15 shadow-xs'
                            : 'bg-white border-stone-200 hover:border-emerald-300'
                        }`}
                      >
                        <div>
                          <span className="block text-sm font-black text-stone-900">
                            {pkg.displayName}
                          </span>
                          {showPrices && (
                            <span className="block text-xs font-extrabold text-[#046A47] mt-0.5">
                              {Number(pkg.price).toLocaleString('en-US')} {pkg.currency || 'ج.م'}
                            </span>
                          )}
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

            {/* Step 2: Crystal Clear Quantity Picker (- / Direct Input / +) */}
            <div className="space-y-3 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm sm:text-base font-black text-stone-900">
                  ٢. عايز كام قطعة؟
                </label>
                <span className="text-[11px] font-bold text-stone-500">
                  اضغط + / - أو اكتب العدد
                </span>
              </div>

              {/* Big Touch Stepper + Editable Input */}
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleStep(-1)}
                  disabled={numericQty <= 1}
                  className="w-14 h-14 rounded-2xl bg-white hover:bg-stone-100 disabled:opacity-40 text-stone-900 border-2 border-stone-300 flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                  title="إنقاص قطعة"
                >
                  <Minus className="w-6 h-6 stroke-[2.5]" />
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
                  className="w-28 sm:w-32 h-14 text-center text-2xl sm:text-3xl font-black text-[#046A47] bg-white border-2 border-[#046A47] rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-inner"
                  aria-label="الكمية المطلوبة"
                />

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleStep(1)}
                  className="w-14 h-14 rounded-2xl bg-[#046A47] hover:bg-[#035237] text-white border-2 border-[#046A47] flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                  title="زيادة قطعة"
                >
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </motion.button>
              </div>

              {/* Quick 1-Tap Quantity Shortcuts */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 3, 5, 10, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantityText(String(preset))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      numericQty === preset
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-400'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Price Total & Primary Confirm CTA */}
            <div className="space-y-3 pt-1">
              {showPrices && currentPackage && (
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs sm:text-sm font-bold text-stone-600">
                    إجمالي سعر ({numericQty} قطعة):
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#046A47]">
                      {Number(totalPrice).toLocaleString('en-US')}
                    </span>
                    <span className="text-xs font-bold text-stone-700">
                      {currentPackage.currency || 'ج.م'}
                    </span>
                  </div>
                </div>
              )}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={!currentPackage}
                className="w-full h-14 bg-[#046A47] hover:bg-[#035237] disabled:opacity-50 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all"
              >
                <ShoppingBag className="w-5 h-5 text-amber-300" />
                <span>تأكيد وإضافة للطلبية ({numericQty} قطعة)</span>
              </motion.button>
            </div>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
};
