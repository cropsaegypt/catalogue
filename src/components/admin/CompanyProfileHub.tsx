import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  FileSpreadsheet,
  Image as ImageIcon,
  History,
  ArrowRight,
  Save,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Layers,
  Package as PackageIcon,
  Edit2,
  FileText,
  ToggleLeft,
  ToggleRight,
  Filter,
} from 'lucide-react';
import { Company, Product, Package, PriceHistory, CompanyImage, Category, CompanySubCategory } from '../../types';
import { ImageFileInput } from '../common/ImageFileInput';
import { excelService } from '../../services/excelService';
import { AiCatalogExtractor } from './AiCatalogExtractor';
import { pdfHelper, PdfPageImage } from '../../utils/pdfHelper';

interface CompanyProfileHubProps {
  company: Company;
  categories: Category[];
  subCategories?: CompanySubCategory[];
  products: Product[];
  packages: Package[];
  priceHistory: PriceHistory[];
  images: CompanyImage[];
  onBack: () => void;
  onBatchUpdatePrices: (
    updates: { productId: string; packageId: string; newPrice: number }[],
    source: 'manual' | 'excel',
    updatedBy: string
  ) => { updatedCount: number; errors: string[] };
  onSaveProducts?: (products: Product[]) => void;
  onSavePackages?: (packages: Package[]) => void;
  onSaveSubCategories?: (subs: CompanySubCategory[]) => void;
  onAddPriceHistory?: (entry: Omit<PriceHistory, 'id' | 'createdAt'>) => void;
  onSaveImages: (images: CompanyImage[]) => void;
  onAddImportLog: (log: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const CompanyProfileHub: React.FC<CompanyProfileHubProps> = ({
  company,
  categories = [],
  subCategories = [],
  products = [],
  packages = [],
  priceHistory = [],
  images = [],
  onBack,
  onBatchUpdatePrices,
  onSaveProducts,
  onSavePackages,
  onSaveSubCategories,
  onAddPriceHistory,
  onSaveImages,
  onAddImportLog,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<
    'products' | 'subcategories' | 'add_product' | 'catalog_images' | 'prices' | 'excel' | 'history'
  >('products');

  // Subcategories for this company
  const companySubs = subCategories.filter((s) => s.companyId === company.id);

  // Products and Packages for this specific company
  const companyProducts = products.filter((p) => p.companyId === company.id);
  const companyProductIds = companyProducts.map((p) => p.id);
  const companyPackages = packages.filter((pkg) => companyProductIds.includes(pkg.productId));
  const companyHistory = priceHistory.filter((h) => companyProductIds.includes(h.productId));
  const companyImages = images.filter((img) => img.companyId === company.id);

  // SubCategory creation/edit modal state
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<CompanySubCategory | null>(null);
  const [subName, setSubName] = useState('');
  const [subType, setSubType] = useState<CompanySubCategory['type']>('fertilizer');
  const [subDesc, setSubDesc] = useState('');

  // Add Product State (Manual vs AI)
  const [useAiExtraction, setUseAiExtraction] = useState(false);

  // Manual Product Form
  const [manualName, setManualName] = useState('');
  const [manualSubCatId, setManualSubCatId] = useState('');
  const [manualProductType, setManualProductType] = useState<'fertilizer' | 'stimulant' | 'pesticide'>('fertilizer');
  const [manualDesc, setManualDesc] = useState('');
  const [manualUsage, setManualUsage] = useState('');
  const [manualCharacteristics, setManualCharacteristics] = useState('');
  const [manualPackageName, setManualPackageName] = useState('1 لتر');
  const [manualPackagePrice, setManualPackagePrice] = useState<number>(100);
  const [manualPackageUnit, setManualPackageUnit] = useState('لتر');
  const [manualImageUrl, setManualImageUrl] = useState('');

  // PDF Extraction & Images state
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractedPdfPages, setExtractedPdfPages] = useState<PdfPageImage[]>([]);

  // Inline price edits
  const [editingPriceMap, setEditingPriceMap] = useState<Record<string, number>>({});

  // Excel Upload state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [excelResult, setExcelResult] = useState<any | null>(null);

  // 1. Save SubCategory Handler
  const handleSaveSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    if (editingSub) {
      const updated = subCategories.map((s) =>
        s.id === editingSub.id
          ? { ...s, name: subName.trim(), type: subType, description: subDesc.trim() }
          : s
      );
      if (onSaveSubCategories) onSaveSubCategories(updated);
      onShowToast('تم تحديث القسم الفرعي بنجاح', 'success');
    } else {
      const newSub: CompanySubCategory = {
        id: 'SUBCAT-' + Date.now(),
        companyId: company.id,
        name: subName.trim(),
        type: subType,
        description: subDesc.trim(),
        displayOrder: companySubs.length + 1,
        active: true,
      };
      if (onSaveSubCategories) onSaveSubCategories([...subCategories, newSub]);
      onShowToast(`تمت إضافة قسم "${newSub.name}" للشركة`, 'success');
    }
    setIsSubModalOpen(false);
    setSubName('');
    setSubDesc('');
    setEditingSub(null);
  };

  const handleDeleteSub = (subId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القسم الفرعي؟')) {
      if (onSaveSubCategories) {
        onSaveSubCategories(subCategories.filter((s) => s.id !== subId));
        onShowToast('تم حذف القسم الفرعي', 'success');
      }
    }
  };

  // 2. Save Manual Product into this Company
  const handleAddManualProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      alert('يرجى إدخال اسم المنتج');
      return;
    }

    const newProdId = `${company.slug ? company.slug.toUpperCase() : 'PRD'}-${Date.now().toString().slice(-4)}`;
    const newPkgId = `${newProdId}-PKG-1`;

    const newProduct: Product = {
      id: newProdId,
      companyId: company.id,
      categoryId: categories[0]?.id || 'CAT-01',
      subCategoryId: manualSubCatId || (companySubs[0]?.id || undefined),
      productType: manualProductType,
      name: manualName.trim(),
      shortDescription: manualDesc.trim() || 'مركب زراعي عالي الجودة والفاعلية',
      description: manualDesc.trim(),
      characteristics: manualCharacteristics.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean),
      composition: [],
      usage: manualUsage.split(/[,،\n]/).map((s) => s.trim()).filter(Boolean),
      mainImageUrl: manualImageUrl || 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=600&auto=format&fit=crop&q=80',
      displayOrder: companyProducts.length + 1,
      active: true,
      allowPieceOrder: true,
      allowCartonOrder: false,
      piecesPerCarton: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newPackage: Package = {
      id: newPkgId,
      productId: newProdId,
      displayName: manualPackageName || '1 لتر',
      quantity: 1,
      unit: manualPackageUnit || 'لتر',
      price: Number(manualPackagePrice) || 100,
      currency: 'جنيه',
      allowPieceOrder: true,
      allowCartonOrder: false,
      piecesPerCarton: 12,
      active: true,
      displayOrder: 1,
    };

    if (onSaveProducts) onSaveProducts([...products, newProduct]);
    if (onSavePackages) onSavePackages([...packages, newPackage]);

    onShowToast(`تمت إضافة المنتج "${newProduct.name}" بنجاح لشركة ${company.name}`, 'success');

    // Reset Form
    setManualName('');
    setManualDesc('');
    setManualUsage('');
    setManualCharacteristics('');
    setManualImageUrl('');
    setActiveTab('products');
  };

  // 3. Extract Images from Uploaded Catalog PDF
  const handlePdfUploadForImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingPdf(true);
    try {
      onShowToast('جاري قراءة صفحات الكتالوج واستخراج الصور...', 'success');
      const renderedPages = await pdfHelper.renderPagesToImages(file, 1, 10, 1000, 0.8);
      setExtractedPdfPages(renderedPages);
      onShowToast(`تم استخراج ${renderedPages.length} صفحة من الكتالوج بنجاح`, 'success');
    } catch (err: any) {
      alert('تعذر استخراج الصور من الكتالوج. تأكد أن الملف سليم.');
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleSavePageAsCompanyImage = (page: PdfPageImage) => {
    const newImg: CompanyImage = {
      id: 'IMG-' + Date.now() + '-' + page.pageNum,
      companyId: company.id,
      fileName: `صفحة كتالوج ${page.pageNum} - ${company.name}`,
      url: page.dataUrl,
      createdAt: new Date().toISOString(),
    };
    onSaveImages([...images, newImg]);
    onShowToast(`تم حفظ صفحة الكتالوج رقم ${page.pageNum} في مكتبة صور الشركة`, 'success');
  };

  // 4. Price and Excel handlers
  const handlePriceChange = (pkgId: string, val: number) => {
    setEditingPriceMap({ ...editingPriceMap, [pkgId]: val });
  };

  const handleSavePrice = (pkg: Package) => {
    const newPrice = editingPriceMap[pkg.id];
    if (newPrice === undefined || newPrice === pkg.price) return;

    onBatchUpdatePrices([{ productId: pkg.productId, packageId: pkg.id, newPrice }], 'manual', 'الأدمن');
    onShowToast(`تم تحديث سعر العبوة (${pkg.displayName}) إلى ${newPrice} جنيه`, 'success');

    const updated = { ...editingPriceMap };
    delete updated[pkg.id];
    setEditingPriceMap(updated);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsAnalyzing(true);
    setExcelResult(null);

    try {
      const results = await excelService.analyzeExcelFile(file);
      if (results && results.length > 0) {
        setExcelResult(results[0]);
        onShowToast(`تم تحليل ملف إكسيل الخاص بشركة ${company.name}`, 'success');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء فحص ملف الإكسيل');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmCompanyExcel = () => {
    if (!excelResult || !excelResult.validUpdates || excelResult.validUpdates.length === 0) {
      alert('لا توجد أسعار محدثة بالملف');
      return;
    }

    const updates = excelResult.validUpdates.map((u: any) => ({
      productId: u.productId,
      packageId: u.packageId,
      newPrice: u.newPrice,
    }));

    const res = onBatchUpdatePrices(updates, 'excel', 'استيراد إكسيل شركة');
    onShowToast(`تم تحديث أسعار ${res.updatedCount} عبوة بنجاح لشركة ${company.name}`, 'success');
    setExcelResult(null);
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            title="رجوع لقائمة الشركات"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#046A47]/30 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-[#046A47]" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900">{company.name}</h2>
              <span className="bg-emerald-100 text-[#046A47] text-[11px] font-black px-2.5 py-0.5 rounded-full">
                مركز إدارة الشركة
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {company.description || 'إدارة الأقسام الفرعية، المنتجات، والأسعار الخاصة بالشركة'}
            </p>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700">
            {companySubs.length} أقسام فرعية
          </span>
          <span className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-[#046A47]">
            {companyProducts.length} منتجات
          </span>
          <span className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-800">
            {companyPackages.length} عبوات
          </span>
        </div>
      </div>

      {/* Internal Navigation Tabs inside Company */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-gray-200 shadow-2xs">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeTab === 'products' ? 'bg-[#046A47] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <PackageIcon className="w-4 h-4" />
          <span>منتجات الشركة ({companyProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subcategories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeTab === 'subcategories' ? 'bg-[#046A47] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>الأقسام الفرعية للشركة ({companySubs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('add_product')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeTab === 'add_product' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>+ إضافة منتج جديد للشركة</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog_images')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeTab === 'catalog_images' ? 'bg-[#046A47] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>الكتالوج واستخراج الصور</span>
        </button>

        <button
          onClick={() => setActiveTab('prices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeTab === 'prices' ? 'bg-[#046A47] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>التسعير السريع ({companyPackages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeTab === 'excel' ? 'bg-[#046A47] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>استيراد إكسيل</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
            activeTab === 'history' ? 'bg-[#046A47] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل الأسعار ({companyHistory.length})</span>
        </button>
      </div>

      {/* TAB 1: Company SubCategories */}
      {activeTab === 'subcategories' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900">الأقسام الفرعية المعتمدة لشركة {company.name}</h3>
              <p className="text-xs text-gray-500 font-medium">
                قم بإضافة الأقسام التابعة لمنتجات هذه الشركة (مثل أسمدة بودر NPK، مخصبات سائلة، مبيدات حشائش، مبيدات فطرية)
              </p>
            </div>
            <button
              onClick={() => {
                setEditingSub(null);
                setSubName('');
                setSubDesc('');
                setIsSubModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قسم فرعي جديد</span>
            </button>
          </div>

          {companySubs.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Layers className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-600">لا توجد أقسام فرعية مضافة لهذه الشركة بعد.</p>
              <p className="text-[11px] text-gray-400">أضف قسماً فرعياً لبدء تصنيف وإضافة منتجات الشركة بسهولة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {companySubs.map((sub) => (
                <div key={sub.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-black text-xs text-gray-900">{sub.name}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          sub.type === 'pesticide'
                            ? 'bg-rose-100 text-rose-800'
                            : sub.type === 'stimulant'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {sub.type === 'pesticide' ? 'مبيد مكافحة' : sub.type === 'stimulant' ? 'مخصب سائل' : 'سماد بودر'}
                      </span>
                    </div>
                    {sub.description && (
                      <p className="text-[11px] text-gray-500 font-medium line-clamp-2">{sub.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200/80 flex items-center justify-between mt-3 text-xs">
                    <span className="text-[10px] text-gray-400 font-bold">
                      {products.filter((p) => p.subCategoryId === sub.id).length} منتج مسجل
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingSub(sub);
                          setSubName(sub.name);
                          setSubType(sub.type);
                          setSubDesc(sub.description || '');
                          setIsSubModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSub(sub.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Company Products Showcase */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-black text-gray-900">جميع منتجات شركة {company.name}</h3>
              <p className="text-xs text-gray-500 font-medium">عرض وإدارة كافة المركبات والعبوات التابعة للشركة</p>
            </div>
            <button
              onClick={() => setActiveTab('add_product')}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة منتج جديد</span>
            </button>
          </div>

          {companyProducts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <PackageIcon className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-600">لم يتم تسجيل أي منتجات لهذه الشركة بعد.</p>
              <button
                onClick={() => setActiveTab('add_product')}
                className="text-xs font-black text-[#046A47] hover:underline"
              >
                اضغط هنا لإضافة منتج يدوياً أو استيراد الكتالوج بالذكاء الاصطناعي
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {companyProducts.map((p) => {
                const prodPkgs = packages.filter((pkg) => pkg.productId === p.id);
                const subCat = companySubs.find((s) => s.id === p.subCategoryId);
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-3 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="h-36 w-full rounded-xl bg-gray-50 border border-gray-100 p-2 flex items-center justify-center mb-2 overflow-hidden">
                        <img
                          src={p.mainImageUrl || 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=300&auto=format&fit=crop&q=80'}
                          alt={p.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[10px] text-gray-400 font-bold">{p.id}</span>
                        {subCat && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                            {subCat.name}
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-xs text-gray-900 line-clamp-1">{p.name}</h4>
                      <p className="text-[11px] text-gray-500 font-medium line-clamp-2 mt-0.5">
                        {p.shortDescription || p.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 mt-2 flex items-center justify-between">
                      <div className="text-xs font-black text-[#046A47]">
                        {prodPkgs[0]?.price ? `${prodPkgs[0].price} ج` : 'السعر غير محدد'}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">{prodPkgs.length} عبوة</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Add Product to Company (Manual vs AI Toggle) */}
      {activeTab === 'add_product' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-6 shadow-xs">
          {/* Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-sm font-black text-gray-900">طريقة إضافة وتغذية منتجات شركة {company.name}:</h3>
              <p className="text-xs text-gray-500 font-medium">
                يمكنك التبديل بحرية بين الإدخال اليدوي المباشر أو التحليل التلقائي لملفات الكتالوج بالذكاء الاصطناعي
              </p>
            </div>

            <button
              type="button"
              onClick={() => setUseAiExtraction(!useAiExtraction)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                useAiExtraction
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{useAiExtraction ? 'إلغاء الذكاء الاصطناعي والتحويل للإدخال اليدوي' : 'تفعيل الاستخراج الذكي بالذكاء الاصطناعي'}</span>
            </button>
          </div>

          {/* Mode A: AI Extractor Embedded specifically for this company */}
          {useAiExtraction ? (
            <div className="border border-amber-300 rounded-3xl p-4 bg-amber-50/20">
              <AiCatalogExtractor
                companies={[company]}
                categories={categories}
                existingProducts={products}
                existingPackages={packages}
                companyImages={images}
                onSaveProducts={onSaveProducts}
                onSavePackages={onSavePackages}
                onAddPriceHistory={onAddPriceHistory}
                onAddImportLog={onAddImportLog}
                onShowToast={onShowToast}
              />
            </div>
          ) : (
            /* Mode B: Manual Direct Form into this company */
            <form onSubmit={handleAddManualProduct} className="space-y-4 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">اسم المنتج التجاري *</label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="مثال: سولوبوتاس 50% أو راند آب"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">القسم الفرعي التابع للشركة *</label>
                  <select
                    value={manualSubCatId}
                    onChange={(e) => setManualSubCatId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden"
                  >
                    <option value="">اختر القسم الفرعي المناسب</option>
                    {companySubs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type === 'pesticide' ? 'مبيد' : s.type === 'stimulant' ? 'مخصب' : 'سماد'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">نوع المركب وتأثيره *</label>
                  <select
                    value={manualProductType}
                    onChange={(e) => setManualProductType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden font-bold"
                  >
                    <option value="fertilizer">سماد بودرة (مسحوق / حبيبات / NPK صلب)</option>
                    <option value="stimulant">مخصب سائل (لتر / سم³ / أحماض ومحفزات)</option>
                    <option value="pesticide">مبيد مكافحة (حشائش / فطري / حشري)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">صورة العبوة أو المنتج</label>
                  <ImageFileInput
                    value={manualImageUrl}
                    onChange={setManualImageUrl}
                    label="رابط أو ملف صورة المنتج:"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">الوصف العام ودور المركب</label>
                <textarea
                  rows={2}
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="وصف مختصر لوظيفة المنتج وفوائده للمحصول..."
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">حجم العبوة</label>
                  <input
                    type="text"
                    value={manualPackageName}
                    onChange={(e) => setManualPackageName(e.target.value)}
                    placeholder="1 لتر أو 1 كجم أو كرتونة"
                    className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">الوحدة</label>
                  <select
                    value={manualPackageUnit}
                    onChange={(e) => setManualPackageUnit(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white font-bold"
                  >
                    <option value="لتر">لتر</option>
                    <option value="كجم">كجم</option>
                    <option value="سم³">سم³</option>
                    <option value="جرام">جرام</option>
                    <option value="كرتونة">كرتونة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">السعر الرسمي (جنيه)</label>
                  <input
                    type="number"
                    value={manualPackagePrice}
                    onChange={(e) => setManualPackagePrice(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-gray-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  حفظ المنتج في شركة {company.name}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 4: Catalog & Images Extraction from PDF */}
      {activeTab === 'catalog_images' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-base font-black text-gray-900">مكتبة صور الكتالوج واستخراج الصفحات</h3>
            <p className="text-xs text-gray-500 font-medium">
              ارفع كتالوج الشركة بصيغة PDF لاستخراج صفحاته وصوره بدقة وحفظها في مكتبة الشركة لاستخدامها مع المنتجات
            </p>
          </div>

          {/* Upload & Extract PDF Section */}
          <div className="bg-[#FAF8F5] p-5 rounded-2xl border-2 border-dashed border-[#046A47]/30 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-[#046A47] rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900">رفع ملف كتالوج PDF لاستخراج الصور والصفحات</h4>
              <p className="text-[11px] text-gray-500">يقوم محرك PDF.js المدمج بتحويل صفحات الكتالوج إلى صور عالية الجودة</p>
            </div>

            <label className="inline-flex items-center gap-2 bg-[#046A47] hover:bg-[#035237] text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-xs">
              <FileText className="w-4 h-4" />
              <span>{isExtractingPdf ? 'جاري الاستخراج...' : 'اختر ملف الكتالوج PDF'}</span>
              <input
                type="file"
                accept=".pdf"
                disabled={isExtractingPdf}
                onChange={handlePdfUploadForImages}
                className="hidden"
              />
            </label>
          </div>

          {/* Render Extracted Pages preview */}
          {extractedPdfPages.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-gray-900">الصفحات والصور المستخرجة حديثاً من الكتالوج:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {extractedPdfPages.map((page) => (
                  <div key={page.pageNum} className="bg-white p-2.5 rounded-2xl border border-gray-200 space-y-2">
                    <div className="h-40 w-full rounded-xl bg-gray-50 border border-gray-100 p-1 flex items-center justify-center overflow-hidden">
                      <img src={page.dataUrl} alt={`Page ${page.pageNum}`} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-700">صفحة {page.pageNum}</span>
                      <button
                        type="button"
                        onClick={() => handleSavePageAsCompanyImage(page)}
                        className="text-[#046A47] hover:underline font-bold"
                      >
                        حفظ كصورة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company Images Gallery */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black text-gray-900">صور الشركة المحفوظة حالياً ({companyImages.length}):</h4>
            {companyImages.length === 0 ? (
              <p className="text-xs text-gray-400">لا توجد صور محفوظة للشركة بعد.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {companyImages.map((img) => (
                  <div key={img.id} className="bg-white p-2.5 rounded-2xl border border-gray-200">
                    <div className="h-32 w-full rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden p-1">
                      <img src={img.url} alt={img.fileName} className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold block truncate mt-1">{img.fileName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Quick Pricing */}
      {activeTab === 'prices' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900">تعديل أسعار عبوات شركة {company.name}</h3>
            <p className="text-xs text-gray-500 font-medium">تعديل فوري وسريع للأسعار بالجنيه المصري مع الحفظ المباشر</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {companyPackages.map((pkg) => {
              const product = products.find((pr) => pr.id === pkg.productId);
              const currentPrice = editingPriceMap[pkg.id] !== undefined ? editingPriceMap[pkg.id] : pkg.price;
              const hasChanged = editingPriceMap[pkg.id] !== undefined && editingPriceMap[pkg.id] !== pkg.price;

              return (
                <div key={pkg.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <h5 className="font-black text-xs text-gray-900">{product?.name || pkg.productId}</h5>
                    <span className="text-[11px] text-gray-500">{pkg.displayName}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={currentPrice}
                      onChange={(e) => handlePriceChange(pkg.id, Number(e.target.value))}
                      className="w-24 text-xs font-mono font-black p-2 rounded-xl border border-gray-300 text-center"
                    />
                    <span className="text-xs text-gray-500">جنيه</span>
                    {hasChanged && (
                      <button
                        onClick={() => handleSavePrice(pkg)}
                        className="p-2 bg-[#046A47] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        حفظ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: Excel Importer */}
      {activeTab === 'excel' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900">استيراد وتحديث أسعار شركة {company.name} عبر الإكسيل</h3>
            <p className="text-xs text-gray-500 font-medium">ارفع ملف إكسيل يحتوي على أسعار منتجات الشركة</p>
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 text-center space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="text-xs" />
          </div>

          {excelResult && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
              <h4 className="text-xs font-black text-emerald-900">نتائج فحص ملف الإكسيل:</h4>
              <p className="text-xs text-emerald-800">
                تم العثور على {excelResult.validUpdates?.length || 0} أسعار مطابقة لمنتجات هذه الشركة.
              </p>
              <button
                onClick={handleConfirmCompanyExcel}
                className="px-5 py-2 bg-[#046A47] text-white rounded-xl font-black text-xs shadow-md"
              >
                تطبيق واعتماد الأسعار الجديدة
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: Price History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-3 shadow-xs">
          <h3 className="text-base font-black text-gray-900">سجل التعديلات السعرية لشركة {company.name}</h3>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {companyHistory.map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900">{h.productName}</span>
                  <span className="text-gray-500 mr-2">({h.packageDisplayName})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="line-through text-gray-400">{h.oldPrice} ج</span>
                  <span>←</span>
                  <span className="font-black text-[#046A47]">{h.newPrice} ج</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {h.createdAt && !isNaN(new Date(h.createdAt).getTime())
                      ? new Date(h.createdAt).toLocaleDateString('ar-EG')
                      : h.createdAt || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SubCategory Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h4 className="text-sm font-black text-gray-900">
                {editingSub ? 'تعديل القسم الفرعي' : `إضافة قسم فرعي لشركة ${company.name}`}
              </h4>
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم القسم الفرعي *</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="مثال: مبيدات حشائش عريضة ورفيعة"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">نوع وتصنيف المنتجات بالقسم *</label>
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden font-bold"
                >
                  <option value="fertilizer">أسمدة بودر صلبة (حبيبات / مسحوق NPK)</option>
                  <option value="stimulant">مخصبات سائلة ومغذيات ورقية</option>
                  <option value="pesticide">مبيدات مكافحة الآفات والحشائش</option>
                  <option value="seeds">بذور وتقاوي زراعية</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">وصف القسم (اختياري)</label>
                <textarea
                  rows={2}
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  placeholder="شرح مختصر لما يحتويه هذا القسم..."
                  className="w-full text-xs p-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-[#046A47] hover:bg-[#035237] text-white rounded-xl shadow-md cursor-pointer"
                >
                  حفظ القسم الفرعي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
