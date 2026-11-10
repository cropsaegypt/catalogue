import React, { useState } from 'react';
import { Search, X, Layers, Building2, Filter, SlidersHorizontal, Check } from 'lucide-react';
import { Category, Company } from '../../types';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategoryId: string;
  onCategorySelect: (catId: string) => void;
  selectedCompanyId: string;
  onCompanySelect: (compId: string) => void;
  categories: Category[];
  companies: Company[];
  totalResultsCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategoryId,
  onCategorySelect,
  selectedCompanyId,
  onCompanySelect,
  categories,
  companies,
  totalResultsCount,
}) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const activeCategories = categories.filter((c) => c.active);
  const activeCompanies = companies.filter((c) => c.active);

  const selectedCategory = activeCategories.find((c) => c.id === selectedCategoryId);
  const selectedCompany = activeCompanies.find((c) => c.id === selectedCompanyId);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategoryId !== 'ALL' || selectedCompanyId !== 'ALL';

  const clearAllFilters = () => {
    onSearchChange('');
    onCategorySelect('ALL');
    onCompanySelect('ALL');
  };

  return (
    <div id="advanced-search-bar" className="bg-white rounded-2xl p-2.5 sm:p-4 border border-gray-200 shadow-2xs space-y-2.5 dir-rtl">
      {/* 1. Main Live Search Input + Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <div className="absolute right-3.5 flex items-center pointer-events-none text-emerald-700">
            <Search className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ابحث بالاسم، المادة الفعالة، الشركة..."
            className="w-full pr-10 pl-16 py-2.5 bg-gray-50 border border-gray-200 focus:border-[#046A47] focus:bg-white rounded-xl text-xs sm:text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
          />

          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Expand Button */}
        <button
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
            hasActiveFilters || isFiltersExpanded
              ? 'bg-[#046A47] text-white border-[#046A47]'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
          }`}
          title="تصفية حسب الشركات والتصنيفات"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">تصفية</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>
      </div>

      {/* Quick Farmer Keywords */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        <span className="text-gray-400 shrink-0 font-bold">كلمات سريعة:</span>
        {[
          { label: '🐛 دودة وحشرات', q: 'دودة' },
          { label: '🍄 أعفان وفطريات', q: 'عفن' },
          { label: '🍅 طماطم', q: 'طماطم' },
          { label: '🥔 بطاطس', q: 'بطاطس' },
          { label: '🌱 تجذير وتسميد', q: 'جذور' },
          { label: '🍎 تحجيم وتزهير', q: 'تحجيم' },
          { label: '💧 هيوميك وأحماض', q: 'هيوميك' },
        ].map((tag) => (
          <button
            key={tag.q}
            type="button"
            onClick={() => onSearchChange(searchQuery === tag.q ? '' : tag.q)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border ${
              searchQuery === tag.q
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                : 'bg-stone-50 hover:bg-emerald-50 text-stone-700 border-stone-200'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* 2. Active Filter Chips & Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 bg-[#046A47] text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs">
              <span>قسم: {selectedCategory.name}</span>
              <button
                onClick={() => onCategorySelect('ALL')}
                className="hover:bg-white/20 rounded-full p-0.5 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {selectedCompany && (
            <span className="inline-flex items-center gap-1 bg-gray-800 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs">
              <span>شركة: {selectedCompany.name}</span>
              <button
                onClick={() => onCompanySelect('ALL')}
                className="hover:bg-white/20 rounded-full p-0.5 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {searchQuery.trim() !== '' && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md">
              <span>بحث: "{searchQuery}"</span>
              <button
                onClick={() => onSearchChange('')}
                className="hover:bg-amber-200 rounded-full p-0.5 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-[10px] sm:text-xs font-bold text-red-600 hover:underline cursor-pointer"
            >
              إلغاء الفلاتر
            </button>
          )}
        </div>

        {/* Live Result Counter */}
        <div className="text-[10px] sm:text-xs font-bold text-[#046A47] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
          <span>{totalResultsCount} منتج متاح</span>
        </div>
      </div>

      {/* 3. Collapsible Filter Drawers (Companies & Categories) */}
      {isFiltersExpanded && (
        <div className="pt-2 border-t border-gray-100 space-y-3 animate-in fade-in duration-200">
          {/* Companies row */}
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#046A47]" />
              <span>الشركات المصنعة:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => onCompanySelect('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCompanyId === 'ALL'
                    ? 'bg-[#046A47] text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                الكل
              </button>
              {activeCompanies.map((comp) => {
                const isSelected = selectedCompanyId === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => onCompanySelect(isSelected ? 'ALL' : comp.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#046A47] text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {comp.logoUrl && (
                      <img
                        src={comp.logoUrl}
                        alt={comp.name}
                        className="w-3.5 h-3.5 object-contain rounded-full bg-white"
                      />
                    )}
                    <span>{comp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categories row */}
          <div>
            <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#046A47]" />
              <span>الأقسام الرئيسية:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => onCategorySelect('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-gray-800 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                جميع الأقسام
              </button>
              {activeCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onCategorySelect(isSelected ? 'ALL' : cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-gray-800 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
