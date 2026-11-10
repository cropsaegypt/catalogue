import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Layers,
  Sprout,
  Droplets,
  ShieldAlert,
  Bug,
  Flame,
  CheckCircle2,
  ArrowDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Category, Company } from '../../types';

export type SelectorViewMode = 'both' | 'by_company' | 'by_category';

interface OnboardingBrowseSelectorProps {
  viewMode: SelectorViewMode;
  onChangeViewMode: (mode: SelectorViewMode) => void;
  companies: Company[];
  categories: Category[];
  selectedCompanyIds: string[];
  selectedCategoryIds: string[];
  selectedProductTypes: string[];
  onToggleCompany: (companyId: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleProductType: (type: string) => void;
  onClearAll: () => void;
  matchingProductsCount: number;
}

export const OnboardingBrowseSelector: React.FC<OnboardingBrowseSelectorProps> = ({
  viewMode,
  onChangeViewMode,
  companies,
  categories,
  selectedCompanyIds,
  selectedCategoryIds,
  selectedProductTypes,
  onToggleCompany,
  onToggleCategory,
  onToggleProductType,
  onClearAll,
  matchingProductsCount,
}) => {
  const activeCompanies = companies.filter((c) => c.active);
  const activeCategories = categories.filter((c) => c.active);

  const quickTypes = [
    {
      id: 'featured',
      title: 'عروض اليوم',
      icon: <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500" />,
      gradient: 'from-amber-100 via-amber-50 to-orange-100',
    },
    {
      id: 'fertilizer',
      title: 'أسمدة بودرة',
      icon: <Sprout className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-700" />,
      gradient: 'from-emerald-100 via-lime-50 to-emerald-50',
    },
    {
      id: 'stimulant',
      title: 'مخصبات سائلة',
      icon: <Droplets className="w-8 h-8 sm:w-10 sm:h-10 text-sky-600" />,
      gradient: 'from-sky-100 via-blue-50 to-cyan-50',
    },
    {
      id: 'pesticide',
      title: 'مبيدات حشائش',
      icon: <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 text-rose-600" />,
      gradient: 'from-rose-100 via-pink-50 to-rose-50',
    },
    {
      id: 'pesticide_insect',
      title: 'مكافحة الحشرات',
      icon: <Bug className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />,
      gradient: 'from-purple-100 via-fuchsia-50 to-purple-50',
    },
  ];

  const totalSelected =
    selectedCompanyIds.length + selectedCategoryIds.length + selectedProductTypes.length;
  const totalCategorySelections = selectedCategoryIds.length + selectedProductTypes.length;

  const scrollToProducts = () => {
    const el = document.getElementById('catalog-products-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="bg-white rounded-3xl border border-stone-200/90 p-3.5 sm:p-5 shadow-xs dir-rtl space-y-4">
      {/* Top Bar: Instant Mode Switcher (Zero Gate Clicks!) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>اختار شركة أو قسم (أو أكثر من واحد معاً)</span>
          </h2>
          <p className="text-[11px] text-stone-500 font-medium">
            اضغط على لوجوهات الشركات أو صور الأقسام لتجميع منتجاتها معاً فوراً
          </p>
        </div>

        {/* Sleek Segmented Control */}
        <div className="inline-flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200/70 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onChangeViewMode('both')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'both'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            الكل معاً
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('by_company')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'by_company'
                ? 'bg-[#046A47] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>الشركات</span>
            {selectedCompanyIds.length > 0 && (
              <span className="bg-amber-400 text-stone-950 text-[10px] px-1.5 rounded-full">
                {selectedCompanyIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('by_category')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'by_category'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>الأقسام</span>
            {totalCategorySelections > 0 && (
              <span className="bg-stone-900 text-white text-[10px] px-1.5 rounded-full">
                {totalCategorySelections}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* COMPANIES FULL-SQUARE LOGOS GRID */}
      <AnimatePresence mode="sync">
        {(viewMode === 'both' || viewMode === 'by_company') && activeCompanies.length > 0 && (
          <motion.div
            key="companies-section"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#046A47]" />
                <span>الشركات المصنعة ({activeCompanies.length})</span>
              </span>
              {selectedCompanyIds.length > 0 && (
                <span className="text-[11px] font-black text-[#046A47]">
                  مختار {selectedCompanyIds.length} شركة
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
              {activeCompanies.map((company) => {
                const isSelected = selectedCompanyIds.includes(company.id);
                return (
                  <motion.button
                    key={company.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onToggleCompany(company.id)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'border-[#046A47] ring-4 ring-emerald-500/20 shadow-md'
                        : 'border-stone-200/80 hover:border-emerald-400 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    {/* Full-Square Logo / Visual */}
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-emerald-700" />
                      </div>
                    )}

                    {/* Clean Dark Bottom Overlay for Name Legibility */}
                    <div
                      className={`absolute inset-x-0 bottom-0 p-1.5 sm:p-2 text-center transition-colors ${
                        isSelected
                          ? 'bg-[#046A47]/95 text-white'
                          : 'bg-gradient-to-t from-black/85 via-black/55 to-transparent text-white pt-6'
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-black line-clamp-1 block">
                        {company.name}
                      </span>
                    </div>

                    {/* Selection Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 bg-[#046A47] text-white rounded-full p-0.5 shadow-md border-2 border-white">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* CATEGORIES FULL-SQUARE PHOTOS / ICONS GRID */}
        {(viewMode === 'both' || viewMode === 'by_category') && (
          <motion.div
            key="categories-section"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2.5 pt-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>الأقسام وأنواع المنتجات</span>
              </span>
              {totalCategorySelections > 0 && (
                <span className="text-[11px] font-black text-amber-700">
                  مختار {totalCategorySelections} قسم
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
              {/* Dynamic Categories with Full-Square Images */}
              {activeCategories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <motion.button
                    key={cat.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onToggleCategory(cat.id)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'border-amber-500 ring-4 ring-amber-400/25 shadow-md'
                        : 'border-stone-200/80 hover:border-amber-400 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-50 to-emerald-50 flex items-center justify-center">
                        <Sprout className="w-10 h-10 text-emerald-700" />
                      </div>
                    )}

                    <div
                      className={`absolute inset-x-0 bottom-0 p-1.5 sm:p-2 text-center transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-gradient-to-t from-black/85 via-black/55 to-transparent text-white pt-6'
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-black line-clamp-2 leading-tight block">
                        {cat.name}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 left-2 bg-amber-500 text-stone-950 rounded-full p-0.5 shadow-md border-2 border-white">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </motion.button>
                );
              })}

              {/* Quick Agricultural Type Full-Square Tiles */}
              {quickTypes.map((item) => {
                const isSelected = selectedProductTypes.includes(item.id);
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onToggleProductType(item.id)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all border-2 flex flex-col items-center justify-between bg-gradient-to-br ${item.gradient} ${
                      isSelected
                        ? 'border-[#046A47] ring-4 ring-emerald-500/20 shadow-md'
                        : 'border-stone-200/80 hover:border-emerald-400 shadow-2xs hover:shadow-md'
                    }`}
                  >
                    <div className="flex-1 w-full flex items-center justify-center pt-2 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>

                    <div
                      className={`w-full p-1.5 sm:p-2 text-center transition-colors ${
                        isSelected
                          ? 'bg-[#046A47] text-white'
                          : 'bg-white/85 backdrop-blur-xs text-stone-900 border-t border-stone-200/50'
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-black line-clamp-1 block">
                        {item.title}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 left-2 bg-[#046A47] text-white rounded-full p-0.5 shadow-md border-2 border-white">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Select Action Bar (Shows when at least 1 company or category is selected) */}
      {totalSelected > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2"
        >
          <button
            type="button"
            onClick={scrollToProducts}
            className="flex-1 sm:flex-initial bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <span>عرض المنتجات المختارة ({matchingProductsCount})</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </button>

          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مسح التحديد ({totalSelected})</span>
          </button>
        </motion.div>
      )}
    </section>
  );
};
