import React from 'react';
import { Layers, Building2, Sparkles, Sprout, ShieldCheck, Check, ArrowRight } from 'lucide-react';
import { Category, Company, CompanySubCategory, CatalogSelectionMode } from '../../types';

interface CustomerModeSelectorProps {
  mode: CatalogSelectionMode;
  onSelectMode: (mode: CatalogSelectionMode) => void;
  categories: Category[];
  companies: Company[];
  subCategories: CompanySubCategory[];
  selectedCategoryId: string;
  onSelectCategory: (catId: string) => void;
  selectedSubCategoryId?: string;
  onSelectSubCategory?: (subId: string) => void;
  selectedCompanyId: string;
  onSelectCompany: (compId: string) => void;
}

export const CustomerModeSelector: React.FC<CustomerModeSelectorProps> = ({
  mode,
  onSelectMode,
  categories,
  companies,
  subCategories,
  selectedCategoryId,
  onSelectCategory,
  selectedSubCategoryId,
  onSelectSubCategory,
  selectedCompanyId,
  onSelectCompany,
}) => {
  // If user hasn't chosen yet ('choose' mode), show the big clean entry choice modal
  if (mode === 'choose') {
    return (
      <div className="bg-white rounded-3xl border-2 border-[#046A47]/30 shadow-xl p-6 sm:p-10 text-center max-w-4xl mx-auto my-6 dir-rtl animate-in fade-in zoom-in-95 duration-300">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-[#046A47] px-4 py-1.5 rounded-full text-xs font-black mb-4">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>أهلاً بك في كتالوج كروپسا CROPSA الزراعي</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#2D2D24] mb-3">
          كيف تفضل تصفح واختيار منتجاتك الزراعية اليوم؟
        </h2>
        <p className="text-sm text-[#5A5A4A] max-w-xl mx-auto mb-8 font-medium">
          اختر الطريقة الأسهل والأنسب لك للتسوق والطلب الفوري، سواء بالنوع أو حسب الشركة المصنعة
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Option 1: By Product / Category */}
          <button
            onClick={() => onSelectMode('by_product')}
            className="group p-6 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-emerald-100/40 border-2 border-emerald-300 hover:border-[#046A47] hover:shadow-lg transition-all text-right flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#046A47] text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-[#046A47] mb-2 flex items-center justify-between">
                <span>تصفح حسب نوع المنتج</span>
                <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-[#5A5A4A] leading-relaxed font-semibold">
                تسلسل واضح يبدأ من (الأسمدة، المخصبات السائلة، مبيدات الحشائش، الفطريات، الحشرات) مع أقسامها الفرعية.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <Sprout className="w-4 h-4 text-emerald-600" />
              <span>مناسب للمزارع والباحث عن علاج محدد</span>
            </div>
          </button>

          {/* Option 2: By Company */}
          <button
            onClick={() => onSelectMode('by_company')}
            className="group p-6 rounded-2xl bg-gradient-to-br from-amber-50/70 to-amber-100/40 border-2 border-amber-300 hover:border-amber-600 hover:shadow-lg transition-all text-right flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-amber-900 mb-2 flex items-center justify-between">
                <span>تصفح حسب الشركة المعتمدة</span>
                <ArrowRight className="w-5 h-5 text-amber-700 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-[#5A5A4A] leading-relaxed font-semibold">
                عرض شامل لجميع لوجوهات وكتالوجات الشركات، والاطلاع على كافة منتجات الشركة في مكان واحد.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>مناسب للتجار والوكلاء والموزعين</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Active navigation top bar with quick switch & hierarchy
  return (
    <div className="bg-white rounded-2xl border border-[#E5E2D9] p-4 shadow-xs dir-rtl space-y-4">
      {/* Switcher Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">طريقة التصفح:</span>
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => onSelectMode('by_product')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'by_product'
                  ? 'bg-[#046A47] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>شراء بالمنتج والتصنيف</span>
            </button>
            <button
              onClick={() => onSelectMode('by_company')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'by_company'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>شراء بالشركة</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => onSelectMode('choose')}
          className="text-[11px] font-bold text-gray-500 hover:text-[#046A47] transition-colors underline cursor-pointer"
        >
          تغيير واجهة الدخول
        </button>
      </div>

      {/* Mode A: By Product Hierarchy */}
      {mode === 'by_product' && (
        <div className="space-y-3">
          {/* Level 1: Main Category Pills */}
          <div>
            <div className="text-[11px] font-black text-gray-500 mb-1.5 flex items-center gap-1">
              <span>١. اختر القسم الرئيسي:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => onSelectCategory('ALL')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  selectedCategoryId === 'ALL'
                    ? 'bg-[#046A47] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                جميع المنتجات والحلول
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? 'bg-[#046A47] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Level 2: SubCategories (if selected category has subcategories or common types) */}
          {subCategories.length > 0 && onSelectSubCategory && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-[11px] font-black text-gray-500 mb-1.5 flex items-center gap-1">
                <span>٢. تصفية فرعية متقدمة (بودر / سائل / مكافحة):</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => onSelectSubCategory('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                    !selectedSubCategoryId || selectedSubCategoryId === 'ALL'
                      ? 'bg-emerald-100 text-[#046A47] border border-emerald-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  الكل
                </button>
                {subCategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelectSubCategory(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                      selectedSubCategoryId === sub.id
                        ? 'bg-emerald-100 text-[#046A47] border border-emerald-400 font-black'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        sub.type === 'pesticide'
                          ? 'bg-rose-500'
                          : sub.type === 'fertilizer'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    ></span>
                    <span>{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode B: By Company Showcase */}
      {mode === 'by_company' && (
        <div className="space-y-3">
          <div className="text-[11px] font-black text-gray-500 mb-1.5">
            اختر الشركة لعرض كافة منتجاتها وأقسامها المعتمدة:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            <button
              onClick={() => onSelectCompany('ALL')}
              className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                selectedCompanyId === 'ALL'
                  ? 'border-[#046A47] bg-emerald-50 text-[#046A47] font-black shadow-2xs'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-bold">جميع الشركات</span>
            </button>
            {companies.map((comp) => {
              const isSelected = selectedCompanyId === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => onSelectCompany(comp.id)}
                  className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-black shadow-xs ring-1 ring-amber-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {comp.logoUrl ? (
                    <img
                      src={comp.logoUrl}
                      alt={comp.name}
                      className="w-8 h-8 rounded-full object-contain border border-gray-100 bg-white"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs">
                      {comp.name.slice(0, 2)}
                    </div>
                  )}
                  <span className="text-[11px] font-bold line-clamp-1">{comp.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
