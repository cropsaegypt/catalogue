import React, { useState, useMemo } from 'react';
import {
  Zap,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Product, Package, Company } from '../../types';
import {
  MatchedPriceProposal,
  parsePriceText,
  parseExcelOrCsvFile,
  extractPricesWithAi,
  matchExtractedItemsWithCatalog,
} from '../../services/smartPriceService';

interface SmartPriceUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  packages: Package[];
  companies: Company[];
  onApplyPriceUpdates: (
    updates: {
      productId: string;
      productName: string;
      packageId: string;
      packageDisplayName: string;
      oldPrice: number;
      newPrice: number;
    }[]
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const SmartPriceUpdateModal: React.FC<SmartPriceUpdateModalProps> = ({
  isOpen,
  onClose,
  products,
  packages,
  companies,
  onApplyPriceUpdates,
  onShowToast,
}) => {
  const [currentStep, setCurrentStep] = useState<'input' | 'review'>('input');
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');

  // Text Input State
  const [rawText, setRawText] = useState('');

  // File Input State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Loading States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Proposals State
  const [proposals, setProposals] = useState<MatchedPriceProposal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'increase' | 'decrease' | 'below_cost' | 'unmatched'
  >('ALL');

  if (!isOpen) return null;

  // Process Text or File
  const handleAnalyzeInput = async () => {
    setIsProcessing(true);
    setProcessingStatus('جاري قراءة واستخراج البيانات...');

    try {
      let extracted: { rawText: string; rawName: string; rawPackage?: string; rawPrice: number }[] = [];

      if (inputMode === 'text') {
        if (!rawText.trim()) {
          onShowToast('يرجى كتابة أو لصق قائمة الأسعار أولاً', 'error');
          setIsProcessing(false);
          return;
        }
        extracted = parsePriceText(rawText);
      } else {
        if (!selectedFile) {
          onShowToast('يرجى اختيار أو رفع ملف الأسعار أولاً', 'error');
          setIsProcessing(false);
          return;
        }

        const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';

        // 1. Excel / CSV
        if (['xlsx', 'xls', 'csv'].includes(ext)) {
          setProcessingStatus('جاري تحليل جداول الإكسيل...');
          extracted = await parseExcelOrCsvFile(selectedFile);
        }
        // 2. Plain Text
        else if (ext === 'txt') {
          const txtContent = await selectedFile.text();
          extracted = parsePriceText(txtContent);
        }
        // 3. Images or PDF via Multimodal AI
        else if (['png', 'jpg', 'jpeg', 'webp', 'pdf'].includes(ext)) {
          setProcessingStatus('جاري الفحص البصري بالذكاء الاصطناعي (AI Vision OCR)...');
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });

          const customKey = localStorage.getItem('cropsa_custom_gemini_key') || undefined;
          extracted = await extractPricesWithAi(dataUrl, selectedFile.name, customKey);
        } else {
          throw new Error('صيغة الملف غير مدعومة. الصيغ المدعومة: Excel, CSV, TXT, PDF, صور');
        }
      }

      if (extracted.length === 0) {
        onShowToast('لم يتم العثور على أصناف وأسعار صالحة في المدخلات', 'error');
        setIsProcessing(false);
        return;
      }

      setProcessingStatus('جاري مطابقة الأصناف مع كتالوج المنتجات...');
      const matched = matchExtractedItemsWithCatalog(extracted, products, packages, companies);

      setProposals(matched);
      setCurrentStep('review');
      onShowToast(`تم استخراج ومطابقة ${matched.length} بند بنجاح ✓`, 'success');
    } catch (err: any) {
      console.error('Price Analysis Error:', err);
      onShowToast(err.message || 'حدث خطأ أثناء معالجة الأسعار', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Modify Package for a proposal row
  const handleChangePackage = (proposalId: string, newPackageId: string) => {
    setProposals((prev) =>
      prev.map((prop) => {
        if (prop.id === proposalId) {
          const targetPkg = prop.availablePackages.find((p) => p.id === newPackageId);
          if (!targetPkg) return prop;
          const oldPrice = targetPkg.price;
          const diff = prop.newPrice - oldPrice;
          const diffPercent = oldPrice > 0 ? (diff / oldPrice) * 100 : 0;
          const costPrice = targetPkg.costPrice || 0;
          return {
            ...prop,
            packageId: targetPkg.id,
            packageName: targetPkg.displayName,
            oldPrice,
            diff,
            diffPercent,
            costPrice,
            isBelowCost: costPrice > 0 && prop.newPrice < costPrice,
          };
        }
        return prop;
      })
    );
  };

  // Modify New Price manually in review table
  const handleChangePrice = (proposalId: string, customPrice: number) => {
    setProposals((prev) =>
      prev.map((prop) => {
        if (prop.id === proposalId) {
          const diff = customPrice - prop.oldPrice;
          const diffPercent = prop.oldPrice > 0 ? (diff / prop.oldPrice) * 100 : 0;
          const isBelowCost = Boolean(prop.costPrice && prop.costPrice > 0 && customPrice < prop.costPrice);
          return {
            ...prop,
            newPrice: customPrice,
            diff,
            diffPercent,
            isBelowCost,
          };
        }
        return prop;
      })
    );
  };

  // Toggle selection
  const toggleSelect = (proposalId: string) => {
    setProposals((prev) =>
      prev.map((prop) => (prop.id === proposalId ? { ...prop, selected: !prop.selected } : prop))
    );
  };

  // Toggle select all visible
  const toggleSelectAll = (filteredItems: MatchedPriceProposal[]) => {
    const allSelected = filteredItems.every((p) => p.selected);
    const targetIds = new Set(filteredItems.map((p) => p.id));
    setProposals((prev) =>
      prev.map((p) => (targetIds.has(p.id) ? { ...p, selected: !allSelected } : p))
    );
  };

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      if (filterType === 'increase' && p.diff <= 0) return false;
      if (filterType === 'decrease' && p.diff >= 0) return false;
      if (filterType === 'below_cost' && !p.isBelowCost) return false;
      if (filterType === 'unmatched' && p.confidence !== 'unmatched') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.rawName.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.packageName.toLowerCase().includes(q)
      );
    });
  }, [proposals, filterType, searchQuery]);

  // Counts
  const selectedCount = proposals.filter((p) => p.selected && p.packageId).length;
  const increaseCount = proposals.filter((p) => p.diff > 0).length;
  const decreaseCount = proposals.filter((p) => p.diff < 0).length;
  const belowCostCount = proposals.filter((p) => p.isBelowCost).length;
  const unmatchedCount = proposals.filter((p) => p.confidence === 'unmatched').length;

  // Confirm and apply updates
  const handleConfirmApply = () => {
    const validApproved = proposals.filter((p) => p.selected && p.packageId);
    if (validApproved.length === 0) return;

    if (belowCostCount > 0) {
      const selectedBelowCost = validApproved.filter((p) => p.isBelowCost).length;
      if (selectedBelowCost > 0) {
        const confirmSave = confirm(
          `⚠️ تنبيه هام: تم تحديد ${selectedBelowCost} عبوة بسعر بيع أقل من سعر التكلفة المحددة!\nهل تريد اعتماد هذه الأسعار بالرغم من ذلك؟`
        );
        if (!confirmSave) return;
      }
    }

    const updates = validApproved.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      packageId: p.packageId,
      packageDisplayName: p.packageName,
      oldPrice: p.oldPrice,
      newPrice: p.newPrice,
    }));

    onApplyPriceUpdates(updates);
    onClose();
  };

  // Sample Text Helper
  const handleInsertSampleText = () => {
    setRawText(
      `كفروكسام 25% : 180 ج\nلمبادا 10% عبوة 1 لتر = 250 جنيه\nزوكسی مورف 450\nكزد اويل 95% - 190\nاسباركلينز 38% 360\nمكة الوكا 46-5-12 : 320\nالجيفول 280\nسوبريم PK 210`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 dir-rtl animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#FAF8F5] border-b border-[#E5E2D9] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#046A47]/10 border border-[#046A47]/20 flex items-center justify-center text-[#046A47]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
                  <span>المحدّث الذكي لأسعار الكتالوج</span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
                    ميزة متقدمة
                  </span>
                </h3>
                <p className="text-xs text-stone-600 font-medium">
                  إدخال الأسعار عبر نص مباشر أو ملف (Excel / CSV / PDF / صورة)، ومطابقتها آلياً مع الكتالوج مع المراجعة والاعتماد اليدوي
                </p>
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCurrentStep('input')}
                className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentStep === 'input'
                    ? 'bg-[#046A47] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span>1. إدخال الأسعار (نص أو ملف)</span>
              </button>
              <span className="text-stone-300">⬅</span>
              <button
                type="button"
                disabled={proposals.length === 0}
                onClick={() => setCurrentStep('review')}
                className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 transition-colors ${
                  currentStep === 'review'
                    ? 'bg-[#046A47] text-white shadow-xs'
                    : proposals.length > 0
                    ? 'bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer'
                    : 'bg-stone-50 text-stone-300 cursor-not-allowed'
                }`}
              >
                <span>2. المراجعة والمطابقة والاعتماد</span>
                {proposals.length > 0 && (
                  <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                    {proposals.length}
                  </span>
                )}
              </button>
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

        {/* STEP 1: INPUT STEP */}
        {currentStep === 'input' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Input Mode Selector */}
            <div className="flex items-center justify-center">
              <div className="bg-[#FAF8F5] p-1.5 rounded-2xl border border-stone-200 inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    inputMode === 'text'
                      ? 'bg-[#046A47] text-white shadow-xs'
                      : 'text-stone-700 hover:bg-stone-200/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>كتابة أو لصق نص مباشر (واتساب / إيميل / جدول)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                    inputMode === 'file'
                      ? 'bg-[#046A47] text-white shadow-xs'
                      : 'text-stone-700 hover:bg-stone-200/60'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع ملف عادي أو مصور (Excel / CSV / PDF / صورة)</span>
                </button>
              </div>
            </div>

            {/* Mode A: Direct Text Input */}
            {inputMode === 'text' && (
              <div className="space-y-3 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800">
                    الصق أو اكتب قائمة المنتجات والأسعار (صنف وسعر في كل سطر أو جملة):
                  </label>
                  <button
                    type="button"
                    onClick={handleInsertSampleText}
                    className="text-[11px] text-[#046A47] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تجربة نموذج أسعار جاهز</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={10}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`مثال:\nكفروكسام 25% : 180 ج\nلمبادا 10% عبوة 1 لتر = 250 جنيه\nزوكسی مورف 420\nكزد اويل 95% - 190\nاسباركلينز 38% 350`}
                    className="w-full bg-[#FAF8F5] border border-stone-300 rounded-2xl p-4 text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#046A47] transition-all leading-relaxed"
                  />
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => setRawText('')}
                      className="absolute left-3 top-3 bg-white/80 hover:bg-white text-stone-400 hover:text-stone-700 text-xs px-2 py-1 rounded-lg border border-stone-200 transition-colors"
                    >
                      مسح
                    </button>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">مرونة عالية:</span> يمكنك لصق نص رسائل واتساب أو إيميلات الموردين أو جداول بدون أي تنسيق معقد؛ سيتعرف النظام تلقائياً على اسم المنتج وسعره وحجم عبوته.
                  </div>
                </div>
              </div>
            )}

            {/* Mode B: File Upload Input */}
            {inputMode === 'file' && (
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="border-2 border-dashed border-stone-300 hover:border-[#046A47] bg-[#FAF8F5] rounded-3xl p-8 text-center transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt,.pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />

                  <div className="space-y-3 pointer-events-none">
                    <div className="w-14 h-14 bg-emerald-100/60 text-[#046A47] rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 group-hover:scale-105 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-stone-900">
                        اضغط لاختيار ملف أو اسحب الملف وأفلته هنا
                      </p>
                      <p className="text-xs text-stone-500 mt-1 font-medium">
                        ندعم ملفات Excel (.xlsx, .xls), CSV, Text (.txt), ومستندات PDF وصور الفواتير وقوائم الأسعار
                      </p>
                    </div>
                  </div>
                </div>

                {/* Selected File Card */}
                {selectedFile && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white text-[#046A47] rounded-xl flex items-center justify-center border border-emerald-200 shrink-0">
                        {selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv') ? (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                        ) : selectedFile.name.endsWith('.pdf') || selectedFile.type.startsWith('image/') ? (
                          <ImageIcon className="w-5 h-5 text-purple-700" />
                        ) : (
                          <FileText className="w-5 h-5 text-stone-700" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-stone-900 block">{selectedFile.name}</span>
                        <span className="text-[11px] text-stone-500 font-medium">
                          {(selectedFile.size / 1024).toFixed(1)} كيلوبايت
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      title="إزالة الملف"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Analyze Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleAnalyzeInput}
                disabled={isProcessing || (inputMode === 'text' ? !rawText.trim() : !selectedFile)}
                className={`px-7 py-3 rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-md transition-all cursor-pointer ${
                  !isProcessing && (inputMode === 'text' ? rawText.trim() : selectedFile)
                    ? 'bg-[#046A47] hover:bg-[#035237] text-white hover:shadow-lg active:scale-95'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{processingStatus || 'جاري المعالجة والمطابقة...'}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 text-emerald-300" />
                    <span>🔍 فحص ومطابقة الأسعار مع الكتالوج والانتقال للمراجعة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW & APPROVAL STEP */}
        {currentStep === 'review' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Review Stats & Toolbar */}
            <div className="p-4 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterType === 'ALL'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  الكل ({proposals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('increase')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterType === 'increase'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>زيادة سعر ({increaseCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('decrease')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterType === 'decrease'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>انخفاض سعر ({decreaseCount})</span>
                </button>
                {belowCostCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType('below_cost')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterType === 'below_cost'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-red-50 text-red-900 border border-red-200 hover:bg-red-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>أقل من التكلفة ({belowCostCount})</span>
                  </button>
                )}
                {unmatchedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType('unmatched')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterType === 'unmatched'
                        ? 'bg-stone-700 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>غير مطابق ({unmatchedCount})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في المقترحات..."
                    className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl pr-9 pl-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => toggleSelectAll(filteredProposals)}
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

            {/* Proposals Review Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px]">
              {filteredProposals.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-xs font-bold text-stone-700">لا توجد بنود مطابقة لهذا الفلتر</p>
                </div>
              ) : (
                <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#FAF8F5] border-b border-stone-200 text-stone-700 font-black">
                      <tr>
                        <th className="p-3 w-10 text-center">#</th>
                        <th className="p-3">المدخل الأصلي</th>
                        <th className="p-3">المنتج المطابق في الكتالوج</th>
                        <th className="p-3">العبوة المستهدفة (يمكنك التغيير)</th>
                        <th className="p-3">السعر الحالي</th>
                        <th className="p-3 text-emerald-800 font-black">السعر الجديد المقترح (قابل للتعديل)</th>
                        <th className="p-3">فرق السعر</th>
                        <th className="p-3 text-center">دقة المطابقة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredProposals.map((item) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            item.selected ? 'bg-white' : 'bg-stone-50/60 opacity-60'
                          } ${item.isBelowCost ? 'bg-red-50/30' : ''}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              disabled={!item.packageId}
                              onChange={() => toggleSelect(item.id)}
                              className="rounded text-[#046A47] focus:ring-[#046A47] w-4 h-4 cursor-pointer accent-[#046A47] disabled:opacity-30"
                            />
                          </td>
                          <td className="p-3 font-mono text-[11px] text-stone-700 max-w-xs truncate">
                            <span className="block font-bold text-stone-900">{item.rawName}</span>
                            {item.rawPackage && (
                              <span className="text-[10px] text-stone-400">عبوة: {item.rawPackage}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {item.productId ? (
                              <div className="flex items-center gap-2">
                                {item.productImage ? (
                                  <img
                                    src={item.productImage}
                                    alt={item.productName}
                                    className="w-8 h-8 rounded-lg object-contain bg-white border border-stone-200 p-0.5 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                                    <Layers className="w-4 h-4" />
                                  </div>
                                )}
                                <div>
                                  <span className="block font-black text-stone-900">{item.productName}</span>
                                  <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-stone-200 inline-block">
                                    {item.companyName}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 px-2 py-1 rounded-lg text-[11px] font-bold">
                                <AlertCircle className="w-3.5 h-3.5 text-stone-400" />
                                <span>غير مطابق في الكتالوج</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {item.availablePackages.length > 0 ? (
                              <select
                                value={item.packageId}
                                onChange={(e) => handleChangePackage(item.id, e.target.value)}
                                className="bg-emerald-50 border border-emerald-300 text-[#046A47] font-black rounded-xl px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#046A47] cursor-pointer"
                              >
                                {item.availablePackages.map((pkg) => (
                                  <option key={pkg.id} value={pkg.id}>
                                    {pkg.displayName} ({pkg.price} ج)
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-stone-400 text-xs">-- لا توجد عبوات --</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-stone-700">
                            {item.oldPrice > 0 ? (
                              <span>{item.oldPrice.toLocaleString()} ج.م</span>
                            ) : (
                              <span className="text-stone-400">غير مسعر</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.newPrice}
                                onChange={(e) =>
                                  handleChangePrice(item.id, parseFloat(e.target.value) || 0)
                                }
                                className={`w-24 border rounded-xl px-2.5 py-1 text-xs font-black focus:outline-none focus:ring-1 ${
                                  item.isBelowCost
                                    ? 'bg-red-50 border-red-400 text-red-950 focus:ring-red-500'
                                    : 'bg-emerald-50/60 border-emerald-300 text-[#046A47] focus:ring-[#046A47]'
                                }`}
                              />
                              <span className="text-stone-500 font-bold text-[11px]">ج.م</span>
                            </div>
                            {item.isBelowCost && (
                              <span className="block text-[10px] text-red-600 font-bold mt-0.5">
                                ⚠️ أقل من التكلفة ({item.costPrice} ج)
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {item.oldPrice > 0 ? (
                              <div className="space-y-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-black ${
                                    item.diff > 0
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : item.diff < 0
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-stone-100 text-stone-700'
                                  }`}
                                >
                                  {item.diff > 0 ? `+${item.diff}` : item.diff} ج.م
                                </span>
                                <span className="block text-[10px] text-stone-500 font-medium">
                                  {item.diffPercent > 0 ? `+${item.diffPercent.toFixed(1)}%` : `${item.diffPercent.toFixed(1)}%`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-700 font-bold text-[11px]">سعر جديد</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.confidence === 'high' && (
                              <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                دقيق 95%
                              </span>
                            )}
                            {item.confidence === 'medium' && (
                              <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                متوسط
                              </span>
                            )}
                            {item.confidence === 'low' && (
                              <span className="bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                منخفض
                              </span>
                            )}
                            {item.confidence === 'unmatched' && (
                              <span className="bg-red-100 text-red-900 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                مفقود
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Footer Action Bar */}
            <div className="p-4 bg-[#FAF8F5] border-t border-[#E5E2D9] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('input')}
                  className="px-4 py-2 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للمدخلات</span>
                </button>

                <div className="text-xs text-stone-600 font-bold">
                  <span>تم تحديد </span>
                  <strong className="text-emerald-800 text-sm font-black">{selectedCount}</strong>
                  <span> من أصل {proposals.length} بند للتعديل</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-stone-500 hover:text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء وإغلاق
                </button>

                <button
                  type="button"
                  onClick={handleConfirmApply}
                  disabled={selectedCount === 0}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer ${
                    selectedCount > 0
                      ? 'bg-[#046A47] hover:bg-[#035237] text-white'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>اعتماد وتطبيق الأسعار المحددة ({selectedCount}) ✓</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
