import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Layers,
  Sprout,
  CheckCircle2,
  ArrowDown,
  RotateCcw,
  CornerDownLeft,
  Search,
  ChevronLeft,
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

  const selectedMainCategoryNames = visibleMainCategories
    .filter((item) => selectedCategoryIds.includes(item.category.id))
    .map((item) => item.category.name);

  return (
    <section
      className={`bg-white dir-rtl ${
        compactModalMode
          ? 'space-y-4'
          : 'rounded-3xl border border-stone-200/90 p-3.5 sm:p-5 shadow-xs space-y-4'
      }`}
    >
      {/* Top Friendly Header */}
      {!compactModalMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-stone-100">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-stone-900">
              تصفّح حسب الشركة والقسم
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-[#046A47] border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              ✓ يمكنك اختيار أكثر من شركة أو قسم معاً
            </span>
          </div>

          {totalSelected > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>مسح الكل ({totalSelected})</span>
            </button>
          )}
        </div>
      )}

      {/* 1. COMPANIES STRIP (Compact horizontal strip + Searchable View-All Button) */}
      {showCompaniesSection && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#046A47]" />
                <span>الشركات المصنعة</span>
                <span className="text-[11px] font-bold text-stone-500">
                  (
                  {hasCategoryRestrictionOnCompanies
                    ? `${companiesMeta.length} من ${totalActiveCompaniesCount}`
                    : totalActiveCompaniesCount}
                  )
                </span>
              </span>

              {hasCategoryRestrictionOnCompanies && (
                <span className="text-[10px] font-bold bg-emerald-50 text-[#046A47] px-2 py-0.5 rounded-full border border-emerald-200">
                  الشركات المتوفر لديها الأقسام المختارة فقط
                </span>
              )}

              {selectedCompanyIds.length > 0 && (
                <span className="text-[10px] font-black bg-[#046A47] text-white px-2 py-0.5 rounded-full">
                  مختار {selectedCompanyIds.length}
                </span>
              )}
            </div>

            {!compactModalMode && totalActiveCompaniesCount > 0 && (
              <button
                type="button"
                onClick={onOpenAllCompanies}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-[#046A47] hover:text-white bg-emerald-50 hover:bg-[#046A47] border border-emerald-200 hover:border-[#046A47] px-3 py-1 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>عرض الكل وبحث ({totalActiveCompaniesCount})</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
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
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-center text-xs font-bold text-stone-500">
              لا توجد شركات مطابقة للأقسام المحددة حالياً
            </div>
          ) : (
            <div
              className={
                compactModalMode
                  ? 'grid grid-cols-2 sm:grid-cols-3 gap-2.5'
                  : 'flex items-stretch gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin'
              }
            >
              {displayedCompanies.map(({ company, matchingCount, totalCount }) => {
                const isSelected = selectedCompanyIds.includes(company.id);
                const countToShow = hasCategoryRestrictionOnCompanies ? matchingCount : totalCount;

                return (
                  <motion.button
                    key={company.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onToggleCompany(company.id)}
                    className={`group relative rounded-2xl p-2 transition-all border-2 flex flex-col items-center justify-between text-center cursor-pointer ${
                      compactModalMode ? 'w-full' : 'w-[104px] sm:w-[116px] shrink-0'
                    } ${
                      isSelected
                        ? 'border-[#046A47] bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-stone-200/80 bg-white hover:border-emerald-400 hover:bg-stone-50/60'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 bg-[#046A47] text-white rounded-full p-0.5 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="w-full h-12 sm:h-14 rounded-xl bg-white border border-stone-100 flex items-center justify-center p-1 overflow-hidden mb-1.5">
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-emerald-700" />
                      )}
                    </div>

                    <div className="w-full space-y-0.5">
                      <span className="text-[11px] font-black text-stone-900 line-clamp-1 block">
                        {company.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold block ${
                          isSelected ? 'text-[#046A47]' : 'text-stone-400'
                        }`}
                      >
                        {countToShow} منتج
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. MAIN CATEGORIES ROW (Filtered dynamically when companies are chosen!) */}
      {showCategoriesSection && (
        <div
          className={`space-y-2.5 ${
            showCompaniesSection && !compactModalMode ? 'pt-2 border-t border-stone-100' : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>
                  {hasCompanyRestrictionOnCategories
                    ? 'الأقسام المتاحة للشركات المختارة'
                    : 'الأقسام الرئيسية'}
                </span>
                <span className="text-[11px] font-bold text-stone-500">
                  ({visibleMainCategories.length})
                </span>
              </span>

              {selectedCategoryIds.length > 0 && (
                <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                  مختار {selectedCategoryIds.length}
                </span>
              )}
            </div>
          </div>

          {visibleMainCategories.length === 0 ? (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-center text-xs font-bold text-stone-500">
              لا توجد أقسام نشطة متاحة في الشركات المختارة حالياً
            </div>
          ) : (
            <div
              className={
                compactModalMode
                  ? 'flex flex-wrap gap-2'
                  : 'flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1 scrollbar-thin'
              }
            >
              {visibleMainCategories.map(({ category, matchingCount, subCategoriesCount }) => {
                const isSelected = selectedCategoryIds.includes(category.id);

                return (
                  <motion.button
                    key={category.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onToggleCategory(category.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border-2 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 border-amber-600 text-stone-950 shadow-xs'
                        : 'bg-stone-50 hover:bg-amber-50/70 border-stone-200 text-stone-800 hover:border-amber-400'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-white border border-black/10 shrink-0 flex items-center justify-center">
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sprout className="w-4 h-4 text-[#046A47]" />
                      )}
                    </div>

                    <div className="text-right leading-tight">
                      <span className="text-xs font-black block whitespace-nowrap">
                        {category.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold block ${
                          isSelected ? 'text-stone-900/80' : 'text-stone-400'
                        }`}
                      >
                        {matchingCount} منتج
                        {subCategoriesCount > 0 ? ` • ${subCategoriesCount} فرعي` : ''}
                      </span>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-stone-950 shrink-0 mr-0.5" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* 3. SUB-CATEGORIES ROW (Appears smoothly under main categories when a main category has children!) */}
          <AnimatePresence initial={false}>
            {visibleSubCategories.length > 0 && (
              <motion.div
                key="subcategories-drawer"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-2.5 sm:p-3 space-y-2 mt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-[#046A47] flex items-center gap-1.5">
                      <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {selectedMainCategoryNames.length === 1
                          ? `الأقسام الفرعية داخل «${selectedMainCategoryNames[0]}» (اختر واحداً أو أكثر):`
                          : 'الأقسام الفرعية المتاحة (اختر واحداً أو أكثر):'}
                      </span>
                    </span>
                    {selectedSubCategoryIds.length > 0 && (
                      <span className="text-[10px] font-black text-white bg-[#046A47] px-2 py-0.5 rounded-full">
                        مختار {selectedSubCategoryIds.length} فرعي
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {visibleSubCategories.map(({ category: sub, parentCategory, matchingCount }) => {
                      const isSubSelected = selectedSubCategoryIds.includes(sub.id);
                      const showParentPrefix = selectedCategoryIds.length > 1 && parentCategory;

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => onToggleSubCategory(sub.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            isSubSelected
                              ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                              : 'bg-white hover:bg-emerald-100/60 text-stone-800 border-emerald-200'
                          }`}
                        >
                          {isSubSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          <span>{sub.name}</span>
                          {showParentPrefix && (
                            <span
                              className={`text-[10px] font-bold ${
                                isSubSelected ? 'text-emerald-100' : 'text-stone-400'
                              }`}
                            >
                              ({parentCategory.name})
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              isSubSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-stone-100 text-stone-500'
                            }`}
                          >
                            {matchingCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Multi-Select Bottom Bar */}
      {!compactModalMode && totalSelected > 0 && (
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={scrollToProducts}
            className="flex-1 sm:flex-initial bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs sm:text-sm px-5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>عرض المنتجات المطابقة ({matchingProductsCount})</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </button>

          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مسح التحديد ({totalSelected})</span>
          </button>
        </div>
      )}
    </section>
  );
};
