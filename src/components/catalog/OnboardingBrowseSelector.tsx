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
          : 'rounded-3xl border border-stone-200/70 px-3.5 py-4 sm:px-6 sm:py-5 shadow-2xs space-y-4'
      }`}
    >
      {/* 1. COMPANIES CIRCULAR BRAND STORIES STRIP */}
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
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center p-2 transition-all duration-200 ${
                        isSelected
                          ? 'ring-2 ring-[#046A47] ring-offset-2 ring-offset-white shadow-sm'
                          : 'ring-1 ring-stone-200/90 group-hover:ring-emerald-400 group-hover:shadow-sm'
                      }`}
                    >
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="w-full h-full object-contain rounded-full transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-[#046A47]" />
                      )}

                      {isSelected && (
                        <span className="absolute -bottom-0.5 -left-0.5 w-5 h-5 rounded-full bg-[#046A47] text-white flex items-center justify-center shadow-xs border-2 border-white">
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

      {/* Subtle Hairline Divider */}
      {showCompaniesSection && showCategoriesSection && !compactModalMode && (
        <div className="border-t border-stone-100" />
      )}

      {/* 2. SOFT CATEGORY PILL TABS + SMOOTH SUB-CATEGORY CHIPS */}
      {showCategoriesSection && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-stone-800">
                {hasCompanyRestrictionOnCategories ? 'أقسام الشركات المختارة' : 'الأقسام'}
              </h2>
              <span className="text-[11px] font-medium text-stone-400">
                اختر قسماً أو أكثر
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
              className={
                compactModalMode
                  ? 'flex flex-wrap gap-2'
                  : 'flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1 scrollbar-none'
              }
            >
              {visibleMainCategories.map(({ category, matchingCount }) => {
                const isSelected = selectedCategoryIds.includes(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onToggleCategory(category.id)}
                    className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#046A47] text-white shadow-xs'
                        : 'bg-stone-100/90 hover:bg-stone-200/70 text-stone-700'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sprout className="w-3.5 h-3.5 text-[#046A47]" />
                      )}
                    </span>

                    <span className="whitespace-nowrap">{category.name}</span>

                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'text-stone-400'
                      }`}
                    >
                      {matchingCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Smooth Floating Sub-Category Chips directly under Category Tabs */}
          <AnimatePresence initial={false}>
            {visibleSubCategories.length > 0 && (
              <motion.div
                key="subcategories-row"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-stone-100/80">
                  <span className="text-[11px] font-bold text-stone-400 pl-1">الأقسام الفرعية:</span>
                  {visibleSubCategories.map(({ category: sub, parentCategory, matchingCount }) => {
                    const isSubSelected = selectedSubCategoryIds.includes(sub.id);
                    const showParentHint = selectedCategoryIds.length > 1 && parentCategory;

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onToggleSubCategory(sub.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          isSubSelected
                            ? 'bg-stone-900 text-white shadow-2xs'
                            : 'bg-white border border-stone-200/90 hover:border-[#046A47]/60 text-stone-700'
                        }`}
                      >
                        {isSubSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                        <span>{sub.name}</span>
                        {showParentHint && (
                          <span className={isSubSelected ? 'text-stone-300' : 'text-stone-400'}>
                            · {parentCategory.name}
                          </span>
                        )}
                        <span
                          className={`text-[10px] ${
                            isSubSelected ? 'text-stone-300' : 'text-stone-400'
                          }`}
                        >
                          ({matchingCount})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
