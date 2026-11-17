import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  Search,
  CheckSquare,
  Square,
  Layers,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Product, Category, CompanySubCategory } from '../../types';
import { AgronomicClassificationProposal } from '../../utils/agronomicClassifier';
import { getUnifiedSubCategoriesForSelection } from '../../utils/categoryHierarchy';

interface AgronomicClassifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: AgronomicClassificationProposal[];
  categories: Category[];
  subCategories: CompanySubCategory[];
  totalProductsCount: number;
  onApplyProposals: (approvedProposals: AgronomicClassificationProposal[]) => void;
}

export const AgronomicClassifierModal: React.FC<AgronomicClassifierModalProps> = ({
  isOpen,
  onClose,
  proposals: initialProposals,
  categories,
  subCategories,
  totalProductsCount,
  onApplyProposals,
}) => {
  const [proposals, setProposals] = useState<AgronomicClassificationProposal[]>(initialProposals);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium'>('all');
  const [isApplying, setIsApplying] = useState(false);

  // Sync when initial proposals change
  React.useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

  // Filtered list
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (filterConfidence !== 'all' && p.confidence !== filterConfidence) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        p.product.name.toLowerCase().includes(q) ||
        p.product.id.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.suggestedSubCategoryName.toLowerCase().includes(q) ||
        p.detectedKeywords.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [proposals, searchQuery, filterConfidence]);

  const selectedCount = useMemo(() => proposals.filter((p) => p.selected).length, [proposals]);

  const toggleSelectAll = () => {
    const allSelected = filteredProposals.every((p) => p.selected);
    const targetIds = new Set(filteredProposals.map((p) => p.product.id));
    setProposals((prev) =>
      prev.map((p) => (targetIds.has(p.product.id) ? { ...p, selected: !allSelected } : p))
    );
  };

  const toggleSelect = (productId: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.product.id === productId ? { ...p, selected: !p.selected } : p))
    );
  };

  const changeSubCategory = (productId: string, newSubId: string, newSubName: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.product.id === productId
          ? {
              ...p,
              suggestedSubCategoryId: newSubId,
              suggestedSubCategoryName: newSubName,
            }
          : p
      )
    );
  };

  const handleConfirm = () => {
    const approved = proposals.filter((p) => p.selected && p.suggestedSubCategoryId);
    if (approved.length === 0) return;
    setIsApplying(true);
    try {
      onApplyProposals(approved);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 dir-rtl animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#FAF8F5] border-b border-[#E5E2D9] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-stone-900">
                  المصنّف الزراعي الذكي للأقسام الفرعية
                </h3>
                <p className="text-xs text-stone-600 font-medium">
                  فحص دقيق للمركبات الزراعية ومطابقة المواد الفعالة والاستخدامات بالأقسام الفرعية المناسبة
                </p>
              </div>
            </div>

            {/* Safety Guarantee Banner */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1 rounded-xl text-xs font-bold mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>ضمان الأمان: الشركات المصنعة والأقسام الرئيسية محمية 100% ولن تتغير نهائياً.</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Search Toolbar */}
        <div className="p-4 bg-white border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-bold">
            <span className="bg-stone-100 text-stone-800 px-3 py-1.5 rounded-xl border border-stone-200">
              إجمالي المنتجات المفحوصة: <strong className="text-stone-900 font-black">{totalProductsCount}</strong>
            </span>
            <span className="bg-amber-50 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-200">
              تعديلات مقترحة: <strong className="text-amber-700 font-black">{proposals.length}</strong>
            </span>
            <span className="bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl border border-emerald-200">
              محددة للتطبيق: <strong className="text-emerald-700 font-black">{selectedCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المنتجات المقترحة..."
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl pr-9 pl-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#046A47]"
              />
            </div>

            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
            >
              {filteredProposals.length > 0 && filteredProposals.every((p) => p.selected) ? (
                <>
                  <Square className="w-3.5 h-3.5 text-stone-600" />
                  <span>إلغاء تحديد الكل</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-[#046A47]" />
                  <span>تحديد الكل</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Proposals Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px]">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-[#046A47] rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-800">
                {proposals.length === 0
                  ? 'رائع! جميع منتجات الكتالوج مصنفة زراعياً بدقة ولا يوجد أي منتج بحاجة لتعديل.'
                  : 'لا توجد نتائج مطابقة لبحثك الحالي.'}
              </p>
            </div>
          ) : (
            <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#FAF8F5] border-b border-stone-200 text-stone-700 font-black">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">المنتج</th>
                    <th className="p-3">الشركة المصنعة (ثابتة)</th>
                    <th className="p-3">القسم الفرعي الحالي</th>
                    <th className="p-3 text-emerald-800 font-black">القسم الفرعي المقترح ⬅</th>
                    <th className="p-3">القرائن الزراعية المكتشفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProposals.map((item) => {
                    const availableOptions = getUnifiedSubCategoriesForSelection(
                      categories,
                      item.product.categoryId,
                      item.product.companyId,
                      subCategories
                    );

                    return (
                      <tr
                        key={item.product.id}
                        className={`hover:bg-amber-50/40 transition-colors ${
                          item.selected ? 'bg-white' : 'bg-stone-50/60 opacity-60'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelect(item.product.id)}
                            className="rounded text-[#046A47] focus:ring-[#046A47] w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-bold text-stone-900">
                          <div className="flex items-center gap-2">
                            {item.product.mainImageUrl ? (
                              <img
                                src={item.product.mainImageUrl}
                                alt={item.product.name}
                                style={
                                  item.product.imageRotation
                                    ? { transform: `rotate(${item.product.imageRotation}deg)` }
                                    : undefined
                                }
                                className="w-8 h-8 rounded-lg object-contain bg-white border border-stone-200 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                <Layers className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <span className="block font-black text-stone-900">{item.product.name}</span>
                              <span className="font-mono text-[10px] text-stone-400">{item.product.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-stone-700">
                          <span className="bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            {item.companyName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-stone-500 font-medium">
                            {item.currentSubCategoryName === 'غير محدد' ? (
                              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10.5px] font-bold">
                                غير محدد
                              </span>
                            ) : (
                              item.currentSubCategoryName
                            )}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={item.suggestedSubCategoryId}
                              onChange={(e) => {
                                const selectedOption = availableOptions.find((o) => o.id === e.target.value);
                                changeSubCategory(
                                  item.product.id,
                                  e.target.value,
                                  selectedOption?.name || e.target.value
                                );
                              }}
                              className="bg-emerald-50 border border-emerald-300 text-[#046A47] font-black rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#046A47] cursor-pointer"
                            >
                              {availableOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.detectedKeywords.map((k, kIdx) => (
                              <span
                                key={kIdx}
                                className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-[#FAF8F5] border-t border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
            <HelpCircle className="w-4 h-4 text-stone-400" />
            <span>
              يمكنك استثناء أي منتج عبر إزالة علامة الاختيار، أو تعديل القسم المقترح من القائمة المنسدلة مباشرة.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isApplying}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#046A47] hover:bg-[#035237] disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isApplying
                  ? 'جاري الحفظ والتطبيق...'
                  : `تأكيد وتطبيق التصنيفات (${selectedCount} منتج) ✓`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
