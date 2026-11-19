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
  RefreshCw,
  Cpu,
  Check,
} from 'lucide-react';
import { Product, Category, CompanySubCategory, Company } from '../../types';
import {
  AgronomicClassificationProposal,
  classifyProductsWithAi,
} from '../../utils/agronomicClassifier';
import {
  getMainCategories,
  getUnifiedSubCategoriesForSelection,
} from '../../utils/categoryHierarchy';

interface AgronomicClassifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: AgronomicClassificationProposal[];
  categories: Category[];
  subCategories: CompanySubCategory[];
  companies?: Company[];
  products?: Product[];
  totalProductsCount: number;
  onApplyProposals: (approvedProposals: AgronomicClassificationProposal[]) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AgronomicClassifierModal: React.FC<AgronomicClassifierModalProps> = ({
  isOpen,
  onClose,
  proposals: initialProposals,
  categories,
  subCategories,
  companies = [],
  products = [],
  totalProductsCount,
  onApplyProposals,
  onShowToast,
}) => {
  const [proposals, setProposals] = useState<AgronomicClassificationProposal[]>(initialProposals);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'category_and_sub' | 'sub_only' | 'ai_only'>('all');
  const [isApplying, setIsApplying] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);

  // Available main categories
  const mainCategories = useMemo(() => getMainCategories(categories), [categories]);

  // Sync when initial proposals change
  React.useEffect(() => {
    setProposals(initialProposals);
  }, [initialProposals]);

  const categoryChangeCount = useMemo(
    () => proposals.filter((p) => p.isCategoryChanged).length,
    [proposals]
  );
  const subOnlyCount = useMemo(
    () => proposals.filter((p) => !p.isCategoryChanged).length,
    [proposals]
  );
  const aiCount = useMemo(
    () => proposals.filter((p) => p.source === 'ai_deep_research').length,
    [proposals]
  );

  // Filtered list
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (filterType === 'category_and_sub' && !p.isCategoryChanged) return false;
      if (filterType === 'sub_only' && p.isCategoryChanged) return false;
      if (filterType === 'ai_only' && p.source !== 'ai_deep_research') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const name = (p.product?.name || '').toLowerCase();
      const id = (p.product?.id || '').toLowerCase();
      const comp = (p.companyName || '').toLowerCase();
      const cat = (p.suggestedCategoryName || '').toLowerCase();
      const sub = (p.suggestedSubCategoryName || '').toLowerCase();
      const kwMatch = Array.isArray(p.detectedKeywords) && p.detectedKeywords.some((k) => (k || '').toLowerCase().includes(q));
      return (
        name.includes(q) ||
        id.includes(q) ||
        comp.includes(q) ||
        cat.includes(q) ||
        sub.includes(q) ||
        kwMatch
      );
    });
  }, [proposals, searchQuery, filterType]);

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

  const changeCategory = (productId: string, newCatId: string, newCatName: string) => {
    setProposals((prev) =>
      prev.map((p) => {
        if (p.product.id === productId) {
          // Resolve subcategories available under the new main category
          const options = getUnifiedSubCategoriesForSelection(
            categories,
            newCatId,
            p.product.companyId,
            subCategories
          );
          const firstSub = options.length > 0 ? options[0] : null;

          return {
            ...p,
            suggestedCategoryId: newCatId,
            suggestedCategoryName: newCatName,
            suggestedSubCategoryId: firstSub ? firstSub.id : '',
            suggestedSubCategoryName: firstSub ? firstSub.name : '',
            isCategoryChanged: newCatId !== p.currentCategoryId,
            isSubCategoryChanged: Boolean(firstSub?.id) && firstSub.id !== p.currentSubCategoryId,
          };
        }
        return p;
      })
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
              isSubCategoryChanged: newSubId !== p.currentSubCategoryId,
            }
          : p
      )
    );
  };

  // AI Deep Research trigger
  const handleRunAiDeepResearch = async () => {
    if (isAiScanning) return;
    const targetProducts =
      proposals.length > 0 ? proposals.map((p) => p.product) : products.slice(0, 30);
    if (targetProducts.length === 0) return;

    setIsAiScanning(true);
    try {
      const customKey = localStorage.getItem('cropsa_custom_gemini_key') || undefined;
      const aiResults = await classifyProductsWithAi(
        targetProducts,
        categories,
        subCategories,
        companies,
        customKey
      );

      if (aiResults.length > 0) {
        // Merge AI proposals with existing proposals
        const aiMap = new Map(aiResults.map((r) => [r.product.id, r]));
        setProposals((prev) => {
          const merged = prev.map((p) => (aiMap.has(p.product.id) ? aiMap.get(p.product.id)! : p));
          // Also add any new ones detected by AI
          const existingIds = new Set(merged.map((p) => p.product.id));
          for (const air of aiResults) {
            if (!existingIds.has(air.product.id)) {
              merged.push(air);
            }
          }
          return merged;
        });

        onShowToast?.(
          `تم استكمال التدقيق الذكي بالذكاء الاصطناعي لـ ${aiResults.length} مركب بنجاح ✓`,
          'success'
        );
      } else {
        onShowToast?.('تم فحص المنتجات بالذكاء الاصطناعي والتأكد من ملاءمة تصنيفاتها.', 'info');
      }
    } catch (err: any) {
      console.error('AI Research Error:', err);
      onShowToast?.(
        err.message || 'تعذر استكمال التدقيق بالذكاء الاصطناعي، تم الحفاظ على النتائج الحالية.',
        'error'
      );
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleConfirm = () => {
    const approved = proposals.filter((p) => p.selected);
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
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 dir-rtl animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#FAF8F5] border-b border-[#E5E2D9] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#046A47]/10 border border-[#046A47]/20 flex items-center justify-center text-[#046A47]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-stone-900">
                  المصنّف الزراعي الذكي للأقسام الرئيسية والفرعية
                </h3>
                <p className="text-xs text-stone-600 font-medium">
                  مطابقة علمية دقيقة للمواد الفعالة واستخدامات المركبات الزراعية لضبط القسم الرئيسي (مبيدات / أسمدة / مخصبات) والأقسام الفرعية المناسبة
                </p>
              </div>
            </div>

            {/* Safety Guarantee & Confirmation Notice */}
            <div className="inline-flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1 rounded-xl text-xs font-bold mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                ضمان الأمان والمراجعة اليدوية: لن يتم تطبيق أو تعديل أي منتج في قاعدة البيانات إلا بعد مراجعتك وتأكيدك بالزر أدناه. الشركة المصنعة ثابتة ومحمية 100%.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills, AI Research Button, Stats & Search Toolbar */}
        <div className="p-4 bg-white border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              الكل ({proposals.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('category_and_sub')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'category_and_sub'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>🔄 تعديل قسم رئيسي + فرعي</span>
              <span className="bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded-full text-[10px]">
                {categoryChangeCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('sub_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'sub_only'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              تعديل قسم فرعي فقط ({subOnlyCount})
            </button>
            {aiCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('ai_only')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'ai_only'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>مدقق بالذكاء الاصطناعي ({aiCount})</span>
              </button>
            )}

            {/* AI Deep Research Button */}
            <button
              type="button"
              onClick={handleRunAiDeepResearch}
              disabled={isAiScanning}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs disabled:opacity-50"
              title="فحص واستقصاء علمي إضافي عبر نموذج الذكاء الاصطناعي للتأكد من المركبات الغامضة"
            >
              {isAiScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-700" />
                  <span>جاري الفحص بالذكاء الاصطناعي...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 text-purple-700" />
                  <span>✨ تدقيق وبحث بالذكاء الاصطناعي (AI Research)</span>
                </>
              )}
            </button>
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
                  ? 'رائع! جميع منتجات الكتالوج مصنفة زراعياً بأقسامها الرئيسية والفرعية بدقة تامة.'
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
                    <th className="p-3">الشركة المصنعة</th>
                    <th className="p-3">التصنيف الحالي</th>
                    <th className="p-3 text-emerald-800 font-black">التصنيف المقترح ⬅ (يمكنك التعديل)</th>
                    <th className="p-3">القرائن والمادة الفعالة المكتشفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProposals.map((item) => {
                    const availableSubOptions = getUnifiedSubCategoriesForSelection(
                      categories,
                      item.suggestedCategoryId,
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
                            className="rounded text-[#046A47] focus:ring-[#046A47] w-4 h-4 cursor-pointer accent-[#046A47]"
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
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-stone-900">{item.product.name}</span>
                                {item.source === 'ai_deep_research' && (
                                  <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[9.5px] font-bold px-1 rounded-sm">
                                    ✨ AI
                                  </span>
                                )}
                              </div>
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
                          <div className="space-y-1">
                            <span className="inline-block bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px] font-bold border border-stone-200">
                              {item.currentCategoryName}
                            </span>
                            <span className="block text-[10.5px] text-stone-500 font-medium">
                              ↳ {item.currentSubCategoryName || 'بدون قسم فرعي'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1.5">
                            {/* Main Category Dropdown Selector */}
                            <div className="flex items-center gap-1">
                              <select
                                value={item.suggestedCategoryId}
                                onChange={(e) => {
                                  const selCat = mainCategories.find((c) => c.id === e.target.value);
                                  changeCategory(
                                    item.product.id,
                                    e.target.value,
                                    selCat?.name || e.target.value
                                  );
                                }}
                                className={`text-xs font-black rounded-xl px-2 py-1 border cursor-pointer ${
                                  item.isCategoryChanged
                                    ? 'bg-amber-100 border-amber-300 text-amber-950 font-black'
                                    : 'bg-stone-100 border-stone-300 text-stone-800'
                                }`}
                              >
                                {mainCategories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>

                              {item.isCategoryChanged && (
                                <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                                  نقل قسم رئيسي
                                </span>
                              )}
                            </div>

                            {/* SubCategory Dropdown Selector */}
                            <select
                              value={item.suggestedSubCategoryId}
                              onChange={(e) => {
                                const selSub = availableSubOptions.find((o) => o.id === e.target.value);
                                changeSubCategory(
                                  item.product.id,
                                  e.target.value,
                                  selSub?.name || e.target.value
                                );
                              }}
                              className="bg-emerald-50 border border-emerald-300 text-[#046A47] font-black rounded-xl px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#046A47] cursor-pointer w-full max-w-xs block"
                            >
                              <option value="">-- بدون قسم فرعي --</option>
                              {availableSubOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  ↳ {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
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
                            <p className="text-[10px] text-stone-500 font-medium line-clamp-2 max-w-xs">
                              {item.reason}
                            </p>
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

        {/* Footer & Final Confirmation Action */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E5E2D9] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-600 font-bold">
            <span>تم تحديد </span>
            <strong className="text-emerald-800 text-sm font-black">{selectedCount}</strong>
            <span> من أصل {proposals.length} منتج بحاجة لتصحيح</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              إلغاء وإغلاق
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isApplying}
              className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer ${
                selectedCount > 0 && !isApplying
                  ? 'bg-[#046A47] hover:bg-[#035237] text-white'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري تطبيق التعديلات المعتمدة...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>اعتماد وتطبيق التصنيفات المحددة ({selectedCount}) ✓</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
