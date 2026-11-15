import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Sprout,
  Check,
  Search,
  RotateCcw,
  ChevronLeft,
  ArrowDown,
  Layers,
  Sparkles,
  Bug,
  ShieldCheck,
  ShieldAlert,
  Droplets,
  FlaskConical,
  Leaf,
  Package,
} from 'lucide-react';
import {
  CompanyAvailabilityItem,
  MainCategoryAvailabilityItem,
  SubCategoryAvailabilityItem,
} from '../../utils/categoryHierarchy';

export type SelectorViewMode = 'both' | 'by_company' | 'by_category';

interface OnboardingBrowseSelectorProps {
  viewMode?: SelectorViewMode;
  companiesMeta: CompanyAvailabilityItem[];
  totalActiveCompaniesCount: number;
  visibleMainCategories: MainCategoryAvailabilityItem[];
  visibleSubCategories: SubCategoryAvailabilityItem[];
  selectedCompanyIds: string[];
  selectedCategoryIds: string[];
  selectedSubCategoryIds: string[];
  onToggleCompany: (companyId: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleSubCategory: (subCategoryId: string) => void;
  onOpenAllCompanies: () => void;
  onClearAll: () => void;
  matchingProductsCount: number;
  hasCategoryRestrictionOnCompanies: boolean;
  hasCompanyRestrictionOnCategories: boolean;
  compactModalMode?: boolean;
}

// Helper to assign a rich visual icon or image to agricultural subcategories
const getSubCategoryVisual = (name: string, imageUrl?: string) => {
  if (imageUrl) {
    return {
      type: 'image' as const,
      url: imageUrl,
    };
  }

  const lower = name.toLowerCase();
  if (lower.includes('حشر') || lower.includes('عناكب') || lower.includes('ديدان')) {
    return {
      type: 'icon' as const,
      icon: <Bug className="w-4 h-4 text-purple-700" />,
      bg: 'bg-purple-100/90 border-purple-200 text-purple-800',
    };
  }
  if (
    lower.includes('فطر') ||
    lower.includes('أعفان') ||
    lower.includes('بياض') ||
    lower.includes('وقائي')
  ) {
    return {
      type: 'icon' as const,
      icon: <ShieldCheck className="w-4 h-4 text-emerald-700" />,
      bg: 'bg-emerald-100/90 border-emerald-200 text-emerald-800',
    };
  }
  if (lower.includes('حشائش') || lower.includes('مكافحة')) {
    return {
      type: 'icon' as const,
      icon: <ShieldAlert className="w-4 h-4 text-rose-700" />,
      bg: 'bg-rose-100/90 border-rose-200 text-rose-800',
    };
  }
  if (
    lower.includes('سائل') ||
    lower.includes('رش') ||
    lower.includes('ري') ||
    lower.includes('بوتاس')
  ) {
    return {
      type: 'icon' as const,
      icon: <Droplets className="w-4 h-4 text-sky-700" />,
      bg: 'bg-sky-100/90 border-sky-200 text-sky-800',
    };
  }
  if (
    lower.includes('بودر') ||
    lower.includes('شكاير') ||
    lower.includes('npk') ||
    lower.includes('سماد')
  ) {
    return {
      type: 'icon' as const,
      icon: <Sprout className="w-4 h-4 text-amber-700" />,
      bg: 'bg-amber-100/90 border-amber-200 text-amber-800',
    };
  }
  if (
    lower.includes('أحماض') ||
    lower.includes('هيوميك') ||
    lower.includes('مخلبي') ||
    lower.includes('عناصر')
  ) {
    return {
      type: 'icon' as const,
      icon: <FlaskConical className="w-4 h-4 text-teal-700" />,
      bg: 'bg-teal-100/90 border-teal-200 text-teal-800',
    };
  }
  if (
    lower.includes('ورق') ||
    lower.includes('نمو') ||
    lower.includes('تزهير') ||
    lower.includes('مغذي')
  ) {
    return {
      type: 'icon' as const,
      icon: <Leaf className="w-4 h-4 text-lime-700" />,
      bg: 'bg-lime-100/90 border-lime-200 text-lime-800',
    };
  }
  if (lower.includes('بذور') || lower.includes('تقاوي') || lower.includes('شتلات')) {
    return {
      type: 'icon' as const,
      icon: <Sparkles className="w-4 h-4 text-amber-700" />,
      bg: 'bg-amber-100/90 border-amber-200 text-amber-800',
    };
  }

  return {
    type: 'icon' as const,
    icon: <Package className="w-4 h-4 text-[#046A47]" />,
    bg: 'bg-emerald-100/90 border-emerald-200 text-[#046A47]',
  };
};

export const OnboardingBrowseSelector: React.FC<OnboardingBrowseSelectorProps> = ({
  viewMode = 'both',
  companiesMeta,
  totalActiveCompaniesCount,
  visibleMainCategories,
  visibleSubCategories,
  selectedCompanyIds,
  selectedCategoryIds,
  selectedSubCategoryIds,
  onToggleCompany,
  onToggleCategory,
  onToggleSubCategory,
  onOpenAllCompanies,
  onClearAll,
  matchingProductsCount,
  hasCategoryRestrictionOnCompanies,
  hasCompanyRestrictionOnCategories,
  compactModalMode = false,
}) => {
  const [inlineCompanySearch, setInlineCompanySearch] = useState('');

  const showCompaniesSection = !compactModalMode || viewMode === 'both' || viewMode === 'by_company';
  const showCategoriesSection = !compactModalMode || viewMode === 'both' || viewMode === 'by_category';

  const displayedCompanies =
    compactModalMode && inlineCompanySearch.trim()
      ? companiesMeta.filter((item) =>
          item.company.name.toLowerCase().includes(inlineCompanySearch.trim().toLowerCase())
        )
      : companiesMeta;

  const totalSelected =
    selectedCompanyIds.length + selectedCategoryIds.length + selectedSubCategoryIds.length;

  const scrollToProducts = () => {
    const el = document.getElementById('catalog-products-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className={`bg-white dir-rtl ${
        compactModalMode
          ? 'space-y-4'
          : 'rounded-3xl border border-stone-200/70 px-3.5 py-4 sm:px-6 sm:py-5 shadow-2xs space-y-5'
      }`}
    >
      {/* 1. COMPANIES FULL-CIRCLE BRAND AVATARS */}
      {showCompaniesSection && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-stone-800">الشركات</h2>
              <span className="text-[11px] font-medium text-stone-400">
                {hasCategoryRestrictionOnCompanies
                  ? `متوفر في ${companiesMeta.length} شركة للأقسام المختارة`
                  : 'اختر شركة أو أكثر'}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {!compactModalMode && totalSelected > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>مسح ({totalSelected})</span>
                </button>
              )}

              {!compactModalMode && totalActiveCompaniesCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenAllCompanies}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[#046A47] hover:underline cursor-pointer"
                >
                  <span>عرض الكل ({totalActiveCompaniesCount})</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {compactModalMode && (
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={inlineCompanySearch}
                onChange={(e) => setInlineCompanySearch(e.target.value)}
                placeholder="ابحث باسم الشركة..."
                className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
              />
            </div>
          )}

          {displayedCompanies.length === 0 ? (
            <p className="text-xs text-stone-400 font-medium py-2">
              لا توجد شركات متاحة للأقسام المختارة حالياً.
            </p>
          ) : (
            <div
              className={
                compactModalMode
                  ? 'grid grid-cols-3 sm:grid-cols-4 gap-3 py-1'
                  : 'flex items-start gap-3.5 sm:gap-5 overflow-x-auto pb-1.5 pt-1 scrollbar-none'
              }
            >
              {displayedCompanies.map(({ company }) => {
                const isSelected = selectedCompanyIds.includes(company.id);

                return (
                  <motion.button
                    key={company.id}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onToggleCompany(company.id)}
                    className="group flex flex-col items-center shrink-0 w-[68px] sm:w-[76px] cursor-pointer focus:outline-none"
                  >
                    {/* Full-bleed circle avatar (zero inner padding so cropped logo fills 100%) */}
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-stone-100 overflow-hidden transition-all duration-200 flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-[#046A47] ring-offset-2 ring-offset-white shadow-sm'
                          : 'ring-1 ring-stone-200/90 group-hover:ring-emerald-400 group-hover:shadow-sm'
                      }`}
                    >
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="w-full h-full object-cover rounded-full transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-[#046A47]" />
                      )}

                      {isSelected && (
                        <span className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-[#046A47] text-white flex items-center justify-center shadow-xs border-2 border-white">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <span
                      className={`mt-1.5 text-[11px] leading-tight text-center line-clamp-1 w-full transition-colors ${
                        isSelected
                          ? 'font-black text-[#046A47]'
                          : 'font-semibold text-stone-600 group-hover:text-stone-900'
                      }`}
                    >
                      {company.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showCompaniesSection && showCategoriesSection && !compactModalMode && (
        <div className="border-t border-stone-100" />
      )}

      {/* 2. 4 MAIN CATEGORY CARDS SIDE-BY-SIDE (1 row desktop, 2x2 mobile) + SUB-CATEGORIES BELOW */}
      {showCategoriesSection && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-stone-800">
                {hasCompanyRestrictionOnCategories ? 'أقسام الشركات المختارة' : 'الأقسام الرئيسية'}
              </h2>
              <span className="text-[11px] font-medium text-stone-400">
                اضغط على القسم لاختياره وعرض أقسامه الفرعية
              </span>
            </div>

            {!compactModalMode && totalSelected > 0 && (
              <button
                type="button"
                onClick={scrollToProducts}
                className="text-[11px] font-bold text-[#046A47] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>عرض {matchingProductsCount} منتج</span>
                <ArrowDown className="w-3 h-3" />
              </button>
            )}
          </div>

          {visibleMainCategories.length === 0 ? (
            <p className="text-xs text-stone-400 font-medium py-1">
              لا توجد أقسام متاحة لهذه الشركة حالياً.
            </p>
          ) : (
            <div
              className={`grid gap-2.5 sm:gap-3.5 ${
                compactModalMode ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              {visibleMainCategories.map(({ category, matchingCount }) => {
                const isSelected = selectedCategoryIds.includes(category.id);

                return (
                  <motion.button
                    key={category.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onToggleCategory(category.id)}
                    className={`group relative h-26 sm:h-32 rounded-2xl overflow-hidden text-right cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-[#046A47] ring-offset-2 shadow-md'
                        : 'ring-1 ring-stone-200/80 hover:ring-emerald-400 hover:shadow-sm'
                    }`}
                  >
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center">
                        <Sprout className="w-9 h-9 text-[#046A47]/70" />
                      </div>
                    )}

                    {/* Clean Gradient Overlay */}
                    <div
                      className={`absolute inset-0 transition-colors ${
                        isSelected
                          ? 'bg-gradient-to-t from-[#046A47]/95 via-[#046A47]/45 to-black/15'
                          : 'bg-gradient-to-t from-black/80 via-black/25 to-transparent'
                      }`}
                    />

                    {/* Subtle Product Count Top-Right */}
                    <span className="absolute top-2 right-2 bg-black/45 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {matchingCount} منتج
                    </span>

                    {/* Selected Check Top-Left */}
                    {isSelected && (
                      <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white text-[#046A47] flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}

                    {/* Category Title Bottom */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                      <span className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-2 block drop-shadow-xs">
                        {category.name}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Sub-Categories Panel Revealed Smoothly Under the Main Category Cards */}
          <AnimatePresence initial={false}>
            {visibleSubCategories.length > 0 && (
              <motion.div
                key="subcategories-panel"
                initial={{ opacity: 0, height: 0, y: -6 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -6 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="mt-3.5 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50/70 via-stone-50/60 to-white border border-emerald-100/90 shadow-2xs space-y-3">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-emerald-100/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-[#046A47] text-white flex items-center justify-center shadow-2xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-stone-900 block leading-tight">
                          {selectedCategoryIds.length === 1
                            ? `الأقسام الفرعية لـ "${
                                visibleMainCategories.find((m) => m.category.id === selectedCategoryIds[0])
                                  ?.category.name || ''
                              }"`
                            : 'الأقسام الفرعية التابعة للأقسام المختارة'}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium">
                          اضغط على الصنف الفرعي لتصفية المنتجات بدقة
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#046A47] bg-white border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                        {visibleSubCategories.length} أقسام فرعية متاحة
                      </span>
                      {selectedSubCategoryIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            selectedSubCategoryIds.forEach((id) => onToggleSubCategory(id));
                          }}
                          className="text-[10px] sm:text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 px-2.5 py-0.5 rounded-full cursor-pointer transition-colors"
                        >
                          مسح الفلتر ({selectedSubCategoryIds.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories Grid of Mini Cards */}
                  <div
                    className={`grid gap-2 sm:gap-2.5 ${
                      compactModalMode
                        ? 'grid-cols-2'
                        : 'grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4'
                    }`}
                  >
                    {/* Card 1: All Subcategories ("عرض كل الأصناف") */}
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        // Clicking "All" clears any active subcategory filters
                        selectedSubCategoryIds.forEach((id) => onToggleSubCategory(id));
                      }}
                      className={`group relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                        selectedSubCategoryIds.length === 0
                          ? 'bg-stone-900 text-white border-stone-900 shadow-sm ring-2 ring-stone-900/20'
                          : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-800 shadow-2xs'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center transition-all ${
                          selectedSubCategoryIds.length === 0
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-100 border border-stone-200 text-stone-700'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs sm:text-[13px] font-black line-clamp-1 block">
                            جميع الأصناف
                          </span>
                          {selectedSubCategoryIds.length === 0 && (
                            <span className="w-4 h-4 rounded-full bg-white text-stone-950 flex items-center justify-center shrink-0 shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold block mt-0.5 ${
                            selectedSubCategoryIds.length === 0 ? 'text-stone-300' : 'text-stone-400'
                          }`}
                        >
                          عرض كل منتجات القسم
                        </span>
                      </div>
                    </motion.button>

                    {/* Subcategories Cards */}
                    {visibleSubCategories.map(({ category: sub, parentCategory, matchingCount }) => {
                      const isSubSelected = selectedSubCategoryIds.includes(sub.id);
                      const showParentHint = selectedCategoryIds.length > 1 && parentCategory;
                      const visual = getSubCategoryVisual(sub.name, sub.imageUrl);

                      return (
                        <motion.button
                          key={sub.id}
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => onToggleSubCategory(sub.id)}
                          className={`group relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                            isSubSelected
                              ? 'bg-[#046A47] text-white border-[#046A47] shadow-sm ring-2 ring-[#046A47]/30'
                              : 'bg-white hover:bg-emerald-50/50 border-stone-200 text-stone-800 hover:border-emerald-300 shadow-2xs'
                          }`}
                        >
                          {/* Visual Thumbnail or Themed Icon */}
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center transition-all ${
                              isSubSelected
                                ? 'bg-white/20 text-white'
                                : visual.type === 'image'
                                  ? 'bg-stone-100 border border-stone-200'
                                  : `${visual.bg} border`
                            }`}
                          >
                            {visual.type === 'image' && visual.url ? (
                              <img
                                src={visual.url}
                                alt={sub.name}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              visual.icon
                            )}
                          </div>

                          {/* Subcategory Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs sm:text-[13px] font-black line-clamp-1 block ${
                                  isSubSelected ? 'text-white' : 'text-stone-900 group-hover:text-[#046A47]'
                                }`}
                              >
                                {sub.name}
                              </span>
                              {isSubSelected && (
                                <span className="w-4 h-4 rounded-full bg-white text-[#046A47] flex items-center justify-center shrink-0 shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                  isSubSelected
                                    ? 'bg-emerald-700/80 text-emerald-100'
                                    : 'bg-stone-100 text-stone-500 group-hover:bg-emerald-100/60 group-hover:text-emerald-800'
                                }`}
                              >
                                {matchingCount} منتج
                              </span>
                              {showParentHint && (
                                <span
                                  className={`text-[10px] font-medium truncate ${
                                    isSubSelected ? 'text-emerald-200' : 'text-stone-400'
                                  }`}
                                >
                                  · {parentCategory.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
