import React, { useState, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  Globe,
  Phone,
  FolderOpen,
  FileSpreadsheet,
  Download,
  Upload,
  Package as PackageIcon,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Company, Category, Product, Package, PriceHistory, CompanyImage, CompanySubCategory } from '../../types';
import { CompanyProfileHub } from './CompanyProfileHub';
import { ImageFileInput } from '../common/ImageFileInput';
import {
  companyExcelService,
  CompanyExcelAnalysisResult,
} from '../../services/companyExcelService';

interface CompanyManagerProps {
  companies: Company[];
  categories: Category[];
  subCategories?: CompanySubCategory[];
  products: Product[];
  packages: Package[];
  priceHistory: PriceHistory[];
  images: CompanyImage[];
  onSaveCompanies: (companies: Company[]) => void;
  onSaveProducts?: (products: Product[]) => void;
  onSavePackages?: (packages: Package[]) => void;
  onSaveSubCategories?: (subs: CompanySubCategory[]) => void;
  onAddPriceHistory?: (entry: Omit<PriceHistory, 'id' | 'createdAt'>) => void;
  onBatchUpdatePrices: (
    updates: { productId: string; packageId: string; newPrice: number }[],
    source: 'manual' | 'excel',
    updatedBy: string
  ) => { updatedCount: number; errors: string[] };
  onSaveImages: (images: CompanyImage[]) => void;
  onAddImportLog: (log: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({
  companies = [],
  categories = [],
  subCategories = [],
  products = [],
  packages = [],
  priceHistory = [],
  images = [],
  onSaveCompanies,
  onSaveProducts,
  onSavePackages,
  onSaveSubCategories,
  onAddPriceHistory,
  onBatchUpdatePrices,
  onSaveImages,
  onAddImportLog,
  onShowToast,
}) => {
  const [activeCompanyHub, setActiveCompanyHub] = useState<Company | null>(null);

  // Quick Products Modal state for viewing all products of a specific company
  const [quickProductsCompany, setQuickProductsCompany] = useState<Company | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productFilterSubCat, setProductFilterSubCat] = useState<string>('all');

  // Excel bulk update states
  const [excelTargetCompany, setExcelTargetCompany] = useState<Company | null>(null);
  const [excelAnalysisResult, setExcelAnalysisResult] = useState<CompanyExcelAnalysisResult | null>(null);
  const [isAnalyzingExcel, setIsAnalyzingExcel] = useState(false);
  const [isApplyingExcel, setIsApplyingExcel] = useState(false);
  const [pendingUploadCompany, setPendingUploadCompany] = useState<Company | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const handleDownloadCompanyExcel = (comp: Company) => {
    try {
      companyExcelService.exportCompanyProductsToExcel(
        comp,
        products,
        packages,
        categories,
        subCategories
      );
      onShowToast(`تم تصدير ملف إكسيل منتجات شركة "${comp.name}" بنجاح`, 'success');
    } catch (e: any) {
      onShowToast(e?.message || 'تعذر تصدير ملف الإكسيل', 'error');
    }
  };

  const handleTriggerUpload = (comp: Company) => {
    setPendingUploadCompany(comp);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadCompany) return;

    setIsAnalyzingExcel(true);
    setExcelTargetCompany(pendingUploadCompany);
    try {
      const result = await companyExcelService.parseAndAnalyzeCompanyExcel(
        file,
        pendingUploadCompany,
        products,
        packages,
        categories,
        subCategories
      );
      setExcelAnalysisResult(result);
      onShowToast(`تم فحص ملف الإكسيل: ${result.totalRows} سطر تم تحليله`, 'success');
    } catch (err: any) {
      alert(err?.message || 'تعذر تحليل ملف الإكسيل. تأكد من سلامة الملف.');
      setExcelTargetCompany(null);
      setExcelAnalysisResult(null);
    } finally {
      setIsAnalyzingExcel(false);
    }
  };

  const handleConfirmExcelUpdates = () => {
    if (!excelAnalysisResult || !excelTargetCompany) return;

    setIsApplyingExcel(true);
    try {
      // 1. Save updated products
      if (onSaveProducts) {
        onSaveProducts(excelAnalysisResult.updatedProductsList);
      }

      // 2. Save updated packages
      if (onSavePackages) {
        onSavePackages(excelAnalysisResult.updatedPackagesList);
      }

      // 3. Log price changes if any
      if (onAddPriceHistory && excelAnalysisResult.priceChanges.length > 0) {
        excelAnalysisResult.priceChanges.forEach((ch) => {
          onAddPriceHistory({
            productId: ch.productId,
            packageId: ch.packageId,
            productName: ch.productName,
            packageDisplayName: ch.packageName,
            oldPrice: ch.oldPrice,
            newPrice: ch.newPrice,
            source: 'excel',
            updatedBy: `إكسيل شركة ${excelTargetCompany.name}`,
          });
        });
      }

      // 4. Log import event
      if (onAddImportLog) {
        onAddImportLog({
          id: 'IMP-' + Date.now(),
          fileName: `تحديث_إكسيل_${excelTargetCompany.name}`,
          totalRows: excelAnalysisResult.totalRows,
          validRows: excelAnalysisResult.productsToUpdateCount,
          changedRows: excelAnalysisResult.priceChanges.length,
          timestamp: new Date().toISOString(),
          status: 'success',
        });
      }

      onShowToast(
        `تم تحديث ${excelAnalysisResult.productsToUpdateCount} منتج و ${excelAnalysisResult.packagesToUpdateCount} عبوة بنجاح لشركة ${excelTargetCompany.name}!`,
        'success'
      );

      setExcelAnalysisResult(null);
      setExcelTargetCompany(null);
    } catch (e: any) {
      onShowToast(e?.message || 'حدث خطأ أثناء تطبيق التحديثات', 'error');
    } finally {
      setIsApplyingExcel(false);
    }
  };

  const openAddModal = () => {
    setEditingCompany(null);
    setName('');
    setDescription('');
    setLogoUrl('');
    setWebsite('');
    setContactInfo('');
    setSelectedCategoryIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setDescription(comp.description || '');
    setLogoUrl(comp.logoUrl || '');
    setWebsite(comp.website || '');
    setContactInfo(comp.contactInfo || '');
    setSelectedCategoryIds(comp.categoryIds || []);
    setIsModalOpen(true);
  };

  const toggleCategorySelection = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedList: Company[];

    if (editingCompany) {
      updatedList = companies.map((c) =>
        c.id === editingCompany.id
          ? {
              ...c,
              name,
              description,
              logoUrl,
              website,
              contactInfo,
              categoryIds: selectedCategoryIds,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      onShowToast('تم تحديث بيانات الشركة بنجاح', 'success');
    } else {
      const newComp: Company = {
        id: 'COMP-' + String(companies.length + 1).padStart(2, '0'),
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        logoUrl,
        description,
        website,
        contactInfo,
        categoryIds: selectedCategoryIds,
        displayOrder: companies.length + 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedList = [...companies, newComp];
      onShowToast('تم إضافة شركة جديدة بنجاح', 'success');
    }

    onSaveCompanies(updatedList);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت تأكد من حذف هذه الشركة؟')) {
      const updated = companies.filter((c) => c.id !== id);
      onSaveCompanies(updated);
      onShowToast('تم حذف الشركة', 'success');
    }
  };

  // If a specific company profile hub is active, render the dedicated hub!
  if (activeCompanyHub) {
    return (
      <CompanyProfileHub
        company={activeCompanyHub}
        categories={categories}
        subCategories={subCategories}
        products={products}
        packages={packages}
        priceHistory={priceHistory}
        images={images}
        onBack={() => setActiveCompanyHub(null)}
        onBatchUpdatePrices={onBatchUpdatePrices}
        onSaveProducts={onSaveProducts}
        onSavePackages={onSavePackages}
        onSaveSubCategories={onSaveSubCategories}
        onAddPriceHistory={onAddPriceHistory}
        onSaveImages={onSaveImages}
        onAddImportLog={onAddImportLog}
        onShowToast={onShowToast}
      />
    );
  }


  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#046A47]" />
            <span>إدارة ومعارض ملفات الشركات المصنعة</span>
          </h2>
          <p className="text-xs text-[#5A5A40] font-medium">كل شركة لها ملف شامل يحتوي الأسعار، الصور، والشيتات الخاصة بها</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-[#046A47] hover:bg-[#035237] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة شركة جديدة</span>
        </button>
      </div>

      {/* Companies Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((comp) => {
          const compCategories = categories.filter((cat) => comp.categoryIds?.includes(cat.id));
          const compProdsCount = products.filter((p) => p.companyId === comp.id).length;

          return (
            <div
              key={comp.id}
              className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white rounded-2xl p-1 border border-[#D4D1C5] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {comp.logoUrl ? (
                      <img src={comp.logoUrl} alt={comp.name} className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <Building2 className="w-7 h-7 text-[#046A47]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#2D2D24]">{comp.name}</h3>
                    <p className="text-xs text-[#5A5A40] font-medium mt-0.5">{comp.description || 'لا يوجد وصف متاح'}</p>
                    <span className="text-[11px] font-bold text-[#046A47] block mt-1">
                      إجمالي المنتجات المتاحة: {compProdsCount} منتجات
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(comp)}
                    className="p-2 bg-[#E5E2D9] hover:bg-[#D4D1C5] text-[#2D2D24] rounded-xl"
                    title="تعديل بيانات الشركة"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(comp.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category associations & Open Hub Button */}
              <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {compCategories.map((cat) => (
                    <span
                      key={cat.id}
                      className="bg-[#E5E2D9] text-[#2D2D24] border border-[#D4D1C5] text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => setActiveCompanyHub(comp)}
                  className="bg-[#046A47] hover:bg-[#035237] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>ملف الشركة الشامل</span>
                </button>
              </div>

              {/* Quick Products List & Excel Action Toolbar */}
              <div className="pt-2 border-t border-[#E5E2D9] grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickProductsCompany(comp);
                    setProductSearchQuery('');
                    setProductFilterSubCat('all');
                  }}
                  className="bg-white hover:bg-emerald-50 text-[#046A47] border border-emerald-300 font-bold text-[11px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  title="استعراض قائمة كاملة بمنتجات وعبوات هذه الشركة"
                >
                  <PackageIcon className="w-3.5 h-3.5 text-[#046A47]" />
                  <span>المنتجات ({compProdsCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadCompanyExcel(comp)}
                  className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  title="تنزيل شيت إكسيل لمنتجات الشركة قابل للتعديل"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تصدير إكسيل</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerUpload(comp)}
                  className="bg-[#046A47] hover:bg-[#035237] text-white font-bold text-[11px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  title="رفع وتحديث منتجات الشركة دفعة واحدة من الإكسيل"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>تحديث إكسيل</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden File Input for Company Excel Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* 1. Quick Company Products Modal (List of all company products with instant Excel download/upload) */}
      {quickProductsCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 dir-rtl animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto border border-emerald-800/20 flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#D4D1C5] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {quickProductsCompany.logoUrl ? (
                    <img src={quickProductsCompany.logoUrl} alt={quickProductsCompany.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Building2 className="w-6 h-6 text-[#046A47]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900">{quickProductsCompany.name}</h3>
                    <span className="bg-emerald-100 text-[#046A47] text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      قائمة المنتجات
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    استعراض المنتجات وتنزيل وتحديث شيت الإكسيل بالكامل دفعة واحدة
                  </p>
                </div>
              </div>

              {/* Top Excel Actions inside modal */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleDownloadCompanyExcel(quickProductsCompany)}
                  className="flex-1 sm:flex-initial bg-white hover:bg-emerald-50 text-[#046A47] border border-emerald-300 font-black text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تنزيل إكسيل قابل للتعديل</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerUpload(quickProductsCompany)}
                  className="flex-1 sm:flex-initial bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>رفع وتحديث الإكسيل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setQuickProductsCompany(null)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter and Search Bar inside products list */}
            {(() => {
              const compProds = products.filter((p) => p.companyId === quickProductsCompany.id);
              const compSubs = subCategories.filter((s) => s.companyId === quickProductsCompany.id);

              const filtered = compProds.filter((p) => {
                const q = productSearchQuery.toLowerCase();
                const matchesQuery =
                  !q ||
                  p.name.toLowerCase().includes(q) ||
                  p.id.toLowerCase().includes(q) ||
                  (p.composition && p.composition.some((c) => c.toLowerCase().includes(q))) ||
                  (p.shortDescription && p.shortDescription.toLowerCase().includes(q));

                const matchesSub =
                  productFilterSubCat === 'all' || p.subCategoryId === productFilterSubCat;

                return matchesQuery && matchesSub;
              });

              return (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="بحث في منتجات الشركة بالاسم أو المادة الفعالة..."
                        className="w-full pr-9 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                      />
                    </div>

                    {compSubs.length > 0 && (
                      <select
                        value={productFilterSubCat}
                        onChange={(e) => setProductFilterSubCat(e.target.value)}
                        className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="all">جميع الأقسام الفرعية ({compSubs.length})</option>
                        {compSubs.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Products Grid / Table */}
                  <div className="max-h-[55vh] overflow-y-auto space-y-2 border border-gray-100 rounded-2xl p-1">
                    {filtered.length === 0 ? (
                      <div className="text-center py-12 space-y-2">
                        <PackageIcon className="w-10 h-10 text-gray-300 mx-auto" />
                        <p className="text-xs font-bold text-gray-600">لا توجد منتجات مطابقة لشركة {quickProductsCompany.name}</p>
                        <p className="text-[11px] text-gray-400">
                          يمكنك تنزيل شيت الإكسيل وإضافة المنتجات فيه ورفعه للتحديث المباشر.
                        </p>
                      </div>
                    ) : (
                      filtered.map((prod) => {
                        const prodPkgs = packages.filter((pkg) => pkg.productId === prod.id);
                        const sub = compSubs.find((s) => s.id === prod.subCategoryId);
                        return (
                          <div
                            key={prod.id}
                            className="bg-white p-3 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                <img
                                  src={prod.mainImageUrl || 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=200&auto=format&fit=crop&q=80'}
                                  alt={prod.name}
                                  style={prod.imageRotation ? { transform: `rotate(${prod.imageRotation}deg)` } : undefined}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-xs text-gray-900 truncate">{prod.name}</h4>
                                  <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {prod.id}
                                  </span>
                                  {sub && (
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                                      {sub.name}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      prod.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {prod.active !== false ? 'نشط' : 'معطل'}
                                  </span>
                                </div>

                                {prod.composition && prod.composition.length > 0 && (
                                  <p className="text-[11px] text-emerald-900 font-medium truncate mt-0.5">
                                    <strong>التركيب:</strong> {prod.composition.join(' | ')}
                                  </p>
                                )}

                                <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                                  {prod.shortDescription || prod.description || 'لا يوجد وصف متاح'}
                                </p>
                              </div>
                            </div>

                            {/* Packages list for this product */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {prodPkgs.length === 0 ? (
                                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg font-bold">
                                  لا توجد عبوات
                                </span>
                              ) : (
                                prodPkgs.map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className="bg-emerald-50/80 border border-emerald-200 px-2 py-1 rounded-lg text-right"
                                  >
                                    <span className="text-[10px] font-bold text-gray-700 block">{pkg.displayName}</span>
                                    <span className="text-xs font-black text-[#046A47]">{pkg.price} ج</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                إجمالي المنتجات المسجلة:{' '}
                <strong className="text-gray-900">
                  {products.filter((p) => p.companyId === quickProductsCompany.id).length}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const comp = quickProductsCompany;
                    setQuickProductsCompany(null);
                    setActiveCompanyHub(comp);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  فتح في ملف الشركة الشامل
                </button>

                <button
                  type="button"
                  onClick={() => setQuickProductsCompany(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-1.5 rounded-xl cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Excel Batch Update Preview & Confirmation Modal */}
      {excelAnalysisResult && excelTargetCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 dir-rtl animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto border border-emerald-800/20">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#046A47] block">مراجعة وتأكيد تحديثات الإكسيل</span>
                <h3 className="text-lg font-black text-gray-900">
                  تحديث منتجات شركة: {excelTargetCompany.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExcelAnalysisResult(null);
                  setExcelTargetCompany(null);
                }}
                className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl text-center">
                <span className="text-[10px] text-gray-500 block font-bold">إجمالي صفوف الشيت</span>
                <span className="text-base font-black text-gray-900">{excelAnalysisResult.totalRows}</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
                <span className="text-[10px] text-emerald-700 block font-bold">منتجات سيتم تحديثها</span>
                <span className="text-base font-black text-emerald-900">{excelAnalysisResult.productsToUpdateCount}</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                <span className="text-[10px] text-amber-800 block font-bold">عبوات سيتم تحديثها</span>
                <span className="text-base font-black text-amber-900">{excelAnalysisResult.packagesToUpdateCount}</span>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-center">
                <span className="text-[10px] text-blue-700 block font-bold">عناصر جديدة تُضاف</span>
                <span className="text-base font-black text-blue-900">
                  {excelAnalysisResult.newProductsCount + excelAnalysisResult.newPackagesCount}
                </span>
              </div>
            </div>

            {/* Price Changes Preview */}
            {excelAnalysisResult.priceChanges.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#046A47]" />
                    <span>فروق وتعديلات الأسعار المكتشفة ({excelAnalysisResult.priceChanges.length}):</span>
                  </h4>
                  <span className="text-[10px] text-gray-500">سيتم تسجيلها في سجل الأسعار تلقائياً</span>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
                  {excelAnalysisResult.priceChanges.map((ch, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-white">
                      <div>
                        <strong className="text-gray-900 block">{ch.productName}</strong>
                        <span className="text-[11px] text-gray-500">{ch.packageName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-gray-400">{ch.oldPrice} ج</span>
                        <span>←</span>
                        <span className="font-black text-[#046A47] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {ch.newPrice} جنيه
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 font-medium">
                لم يتم رصد تغييرات في الأسعار (سيتم تحديث نصوص المنتجات، التراكيب، العبوات، والبيانات الأخرى).
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setExcelAnalysisResult(null);
                  setExcelTargetCompany(null);
                }}
                disabled={isApplyingExcel}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmExcelUpdates}
                disabled={isApplyingExcel}
                className="px-5 py-2.5 bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                <span>{isApplyingExcel ? 'جاري تطبيق التحديثات...' : 'تطبيق واعتماد كافة التحديثات فوراً ✓'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dir-rtl">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto border border-[#E5E2D9]">
            <h3 className="text-lg font-black text-[#2D2D24]">
              {editingCompany ? 'تعديل شركة' : 'إضافة شركة جديدة'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">اسم الشركة *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm font-bold text-[#2D2D24]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">ربط بالأقسام الرئيسية (تعدد الخيارات)</label>
                <div className="grid grid-cols-2 gap-2 border border-[#D4D1C5] p-3 rounded-xl max-h-36 overflow-y-auto bg-white">
                  {categories.filter((cat) => !cat.parentId).map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs font-semibold text-[#2D2D24] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={() => toggleCategorySelection(cat.id)}
                        className="rounded text-[#046A47] focus:ring-[#046A47] w-4 h-4"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">وصف ملخص للشركة</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm text-[#2D2D24]"
                />
              </div>

              {/* Logo File Upload using ImageFileInput with interactive circular cropper */}
              <ImageFileInput
                value={logoUrl}
                onChange={setLogoUrl}
                cropShape="circle"
                label="شعار/لوجو الشركة (اختر الصورة وقصها داخل الدائرة):"
              />

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">الموقع الإلكتروني</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full p-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm text-[#2D2D24]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-[#E5E2D9] hover:bg-[#D4D1C5] rounded-xl text-xs font-bold text-[#2D2D24]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#046A47] hover:bg-[#035237] rounded-xl text-xs font-bold text-white shadow-xs"
                >
                  حفظ الشركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
