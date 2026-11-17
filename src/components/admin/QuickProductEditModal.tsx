import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Package as PackageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  DollarSign,
  Building2,
  Layers,
  Sparkles,
  Tag,
  Boxes,
  RotateCw,
  RotateCcw,
  Upload,
  Loader2,
  Undo2,
} from 'lucide-react';
import { Product, Package, Company, Category, CompanySubCategory } from '../../types';
import { getMainCategories, getSubCategories, getUnifiedSubCategoriesForSelection } from '../../utils/categoryHierarchy';
import { getAgriculturalProductImage, AGRICULTURAL_PRESET_IMAGES } from '../../utils/agriculturalImages';
import { rotateAndUploadImage } from '../../utils/imageRotation';
import { aiCatalogService } from '../../services/aiCatalogService';

interface QuickProductEditModalProps {
  product: Product | null;
  packages: Package[];
  companies: Company[];
  categories: Category[];
  subCategories?: CompanySubCategory[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Product, updatedPackages: Package[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const QuickProductEditModal: React.FC<QuickProductEditModalProps> = ({
  product,
  packages,
  companies,
  categories,
  subCategories = [],
  isOpen,
  onClose,
  onSave,
  onShowToast,
}) => {
  if (!isOpen || !product) return null;

  // Filter packages belonging to this product
  const initialProductPackages = packages.filter((pkg) => pkg.productId === product.id);

  // Form State
  const [name, setName] = useState(product.name || '');
  const [companyId, setCompanyId] = useState(product.companyId || companies[0]?.id || '');
  const [categoryId, setCategoryId] = useState(product.categoryId || categories[0]?.id || '');
  const [subCategoryId, setSubCategoryId] = useState(product.subCategoryId || '');
  const [shortDescription, setShortDescription] = useState(product.shortDescription || '');
  const [mainImageUrl, setMainImageUrl] = useState(product.mainImageUrl || '');
  const [active, setActive] = useState(product.active !== false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCleaningBg, setIsCleaningBg] = useState(false);
  const [originalImageBeforeClean, setOriginalImageBeforeClean] = useState<string | null>(null);

  const handleRotate = async (degrees: 90 | -90 | 180) => {
    if (!mainImageUrl || isRotating || isUploading) return;
    setIsRotating(true);
    try {
      const rotated = await rotateAndUploadImage(mainImageUrl, degrees, `quick-rot-${product.id}`);
      if (rotated) {
        setMainImageUrl(rotated);
        onShowToast('تم تدوير صورة المنتج وتعديلها بنجاح ✓', 'success');
      }
    } catch {
      onShowToast('تعذر تدوير الصورة', 'error');
    } finally {
      setIsRotating(false);
    }
  };

  const handleCleanBg = async () => {
    if (!mainImageUrl || isCleaningBg) return;
    setIsCleaningBg(true);
    try {
      const prev = mainImageUrl;
      const cleaned = await aiCatalogService.cleanBackgroundAndUpload(mainImageUrl, `quick-clean-${product.id}`);
      if (cleaned) {
        setOriginalImageBeforeClean(prev);
        setMainImageUrl(cleaned);
        onShowToast('تم تفريغ خلفية الصورة بدقة فائقة مع الحفاظ على تفاصيل المنتج ✓', 'success');
      } else {
        onShowToast('الصورة شفافة بالفعل أو لا تحتوي على خلفية قابلة للإزالة', 'error');
      }
    } finally {
      setIsCleaningBg(false);
    }
  };

  const handleRestoreOriginal = () => {
    if (originalImageBeforeClean) {
      setMainImageUrl(originalImageBeforeClean);
      setOriginalImageBeforeClean(null);
      onShowToast('تمت استعادة الصورة الأصلية بنجاح ✓', 'success');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';
    setIsUploading(true);
    try {
      const compressed = await aiCatalogService.compressImage(file, 1080, 0.85);
      if (compressed) {
        const uploaded = await aiCatalogService.uploadExtractedImage(compressed, `quick-up-${product.id}`);
        setMainImageUrl(uploaded || compressed);
        onShowToast('تم رفع وتجهيز صورة المنتج بنجاح ✓', 'success');
      }
    } catch {
      onShowToast('تعذر رفع الصورة', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Stock Control State
  const [isOutOfStock, setIsOutOfStock] = useState<boolean>(() => {
    return Boolean(
      product.isOutOfStock ||
      (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0)
    );
  });
  const [stockQuantity, setStockQuantity] = useState<number>(() => {
    return typeof product.stockQuantity === 'number' ? product.stockQuantity : 50;
  });

  // Local Packages State
  const [productPackages, setProductPackages] = useState<
    Array<{
      id: string;
      displayName: string;
      quantity: number;
      unit: string;
      price: number;
      costPrice?: number;
      stockQuantity?: number;
      isOutOfStock?: boolean;
    }>
  >(() => {
    if (initialProductPackages.length > 0) {
      return initialProductPackages.map((pkg) => ({
        id: pkg.id,
        displayName: pkg.displayName || `${pkg.quantity || 1} ${pkg.unit || 'لتر'}`,
        quantity: pkg.quantity || 1,
        unit: pkg.unit || 'لتر',
        price: pkg.price || 0,
        costPrice: pkg.costPrice,
        stockQuantity: typeof pkg.stockQuantity === 'number' ? pkg.stockQuantity : 50,
        isOutOfStock: Boolean(pkg.isOutOfStock || product.isOutOfStock),
      }));
    }
    return [
      {
        id: `PKG-${product.id}-1`,
        displayName: '1 لتر',
        quantity: 1,
        unit: 'لتر',
        price: 0,
        stockQuantity: 50,
        isOutOfStock: false,
      },
    ];
  });

  // Sync state whenever product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCompanyId(product.companyId || companies[0]?.id || '');
      setCategoryId(product.categoryId || categories[0]?.id || '');
      setSubCategoryId(product.subCategoryId || '');
      setShortDescription(product.shortDescription || '');
      setMainImageUrl(product.mainImageUrl || '');
      setActive(product.active !== false);

      const outOfStockFlag = Boolean(
        product.isOutOfStock ||
        (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0)
      );
      setIsOutOfStock(outOfStockFlag);
      setStockQuantity(typeof product.stockQuantity === 'number' ? product.stockQuantity : 50);

      const pkgs = packages.filter((pkg) => pkg.productId === product.id);
      if (pkgs.length > 0) {
        setProductPackages(
          pkgs.map((pkg) => ({
            id: pkg.id,
            displayName: pkg.displayName || `${pkg.quantity || 1} ${pkg.unit || 'لتر'}`,
            quantity: pkg.quantity || 1,
            unit: pkg.unit || 'لتر',
            price: pkg.price || 0,
            costPrice: pkg.costPrice,
            stockQuantity: typeof pkg.stockQuantity === 'number' ? pkg.stockQuantity : 50,
            isOutOfStock: Boolean(pkg.isOutOfStock || product.isOutOfStock),
          }))
        );
      } else {
        setProductPackages([
          {
            id: `PKG-${product.id}-1`,
            displayName: '1 لتر',
            quantity: 1,
            unit: 'لتر',
            price: 0,
            stockQuantity: 50,
            isOutOfStock: false,
          },
        ]);
      }
    }
  }, [product, packages, companies, categories]);

  // Main Categories and Subcategories for selected category
  const mainCategories = getMainCategories(categories);
  const subCats = getUnifiedSubCategoriesForSelection(categories, categoryId, companyId, subCategories);

  // Toggle Out of Stock
  const handleToggleStock = () => {
    const nextState = !isOutOfStock;
    setIsOutOfStock(nextState);

    if (nextState) {
      // Product is being taken out of stock
      setStockQuantity(0);
      setProductPackages((prev) =>
        prev.map((pkg) => ({
          ...pkg,
          isOutOfStock: true,
          stockQuantity: 0,
        }))
      );
      onShowToast(`تم إخراج "${name || product.name}" من المخزون مؤقتاً`, 'success');
    } else {
      // Product is restored back to stock
      const restoredQty = stockQuantity > 0 ? stockQuantity : 50;
      setStockQuantity(restoredQty);
      setProductPackages((prev) =>
        prev.map((pkg) => ({
          ...pkg,
          isOutOfStock: false,
          stockQuantity: typeof pkg.stockQuantity === 'number' && pkg.stockQuantity > 0 ? pkg.stockQuantity : restoredQty,
        }))
      );
      onShowToast(`تمت إعادة "${name || product.name}" للمخزون كمنتج متوفر`, 'success');
    }
  };

  // Add new package
  const handleAddPackage = () => {
    const newIdx = productPackages.length + 1;
    setProductPackages((prev) => [
      ...prev,
      {
        id: `PKG-${product.id}-${Date.now().toString().slice(-4)}`,
        displayName: `${newIdx} لتر`,
        quantity: newIdx,
        unit: 'لتر',
        price: 0,
        stockQuantity: isOutOfStock ? 0 : 50,
        isOutOfStock: isOutOfStock,
      },
    ]);
  };

  // Remove package
  const handleRemovePackage = (pkgId: string) => {
    if (productPackages.length <= 1) {
      onShowToast('يجب أن يحتوي المنتج على عبوة واحدة على الأقل', 'error');
      return;
    }
    setProductPackages((prev) => prev.filter((pkg) => pkg.id !== pkgId));
  };

  // Update specific package field
  const handleUpdatePackage = (
    pkgId: string,
    field: 'displayName' | 'quantity' | 'unit' | 'price' | 'costPrice',
    val: any
  ) => {
    setProductPackages((prev) =>
      prev.map((pkg) => (pkg.id === pkgId ? { ...pkg, [field]: val } : pkg))
    );
  };

  // Save handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      onShowToast('يرجى كتابة اسم المنتج', 'error');
      return;
    }

    const finalStockQty = isOutOfStock ? 0 : Math.max(0, Number(stockQuantity) || 0);

    const updatedProduct: Product = {
      ...product,
      name: name.trim(),
      companyId,
      categoryId,
      subCategoryId: subCategoryId || undefined,
      shortDescription: shortDescription.trim() || name.trim(),
      mainImageUrl: mainImageUrl.trim() || undefined,
      isOutOfStock,
      stockQuantity: finalStockQty,
      active,
      updatedAt: new Date().toISOString(),
    };

    const updatedPackages: Package[] = productPackages.map((pkg, idx) => ({
      id: pkg.id || `PKG-${product.id}-${idx + 1}`,
      productId: product.id,
      displayName: pkg.displayName.trim() || `${pkg.quantity || 1} ${pkg.unit || 'لتر'}`,
      quantity: Number(pkg.quantity) || 1,
      unit: pkg.unit.trim() || 'لتر',
      price: Math.max(0, Number(pkg.price) || 0),
      costPrice: typeof pkg.costPrice === 'number' ? pkg.costPrice : Math.round((Number(pkg.price) || 0) * 0.75),
      currency: 'ج.م',
      isOutOfStock: isOutOfStock,
      stockQuantity: isOutOfStock ? 0 : typeof pkg.stockQuantity === 'number' ? pkg.stockQuantity : finalStockQty,
      allowPieceOrder: true,
      allowCartonOrder: true,
      piecesPerCarton: product.piecesPerCarton || 12,
      active: active,
      displayOrder: idx + 1,
    }));

    onSave(updatedProduct, updatedPackages);
    onShowToast(`تم حفظ وتحديث بيانات "${updatedProduct.name}" بنجاح ✓`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs dir-rtl animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#046A47] via-[#035136] to-[#023321] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-black">
              <PackageIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">{name || product.name}</h3>
                <span className="font-mono text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold text-emerald-100">
                  {product.id}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 font-medium">
                تعديل سريع للتفاصيل وإدارة فورية للمخزون والأسعار
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-[#FAF8F5]/60 flex-1">
          {/* 1. STOCK CONTROL BANNER (إدارة المخزون المباشرة) */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs ${
              isOutOfStock
                ? 'bg-rose-50 border-rose-400 text-rose-950'
                : 'bg-emerald-50 border-emerald-500 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isOutOfStock ? 'bg-rose-500 text-white' : 'bg-[#046A47] text-white'
                }`}
              >
                {isOutOfStock ? <AlertCircle className="w-6 h-6" /> : <Boxes className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm">
                    {isOutOfStock ? 'المنتج خارج المخزون (نفذ من المخزون ✕)' : 'المنتج متوفر بالمخزون حالياً ✓'}
                  </h4>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isOutOfStock ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {isOutOfStock ? 'غير متاح للطلب' : 'متاح للطلب المباشر'}
                  </span>
                </div>
                <p className="text-xs opacity-80 mt-0.5">
                  {isOutOfStock
                    ? 'المنتج معلم كنفد من المخزون، يمكنك إعادته للمخزون بنقرة واحدة.'
                    : 'المنتج يظهر بالكتالوج للعملاء مع إمكانية إضافته لطلبياتهم.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleToggleStock}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                  isOutOfStock
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {isOutOfStock ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                    <span>إعادة للمخزون ✓</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-white" />
                    <span>أخرجه من المخزون ✕</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stock Quantity & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-stone-200">
            <div>
              <label className="text-xs font-black text-stone-700 block mb-1">
                رصيد المخزون المتوفر (عبوة):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  disabled={isOutOfStock}
                  value={isOutOfStock ? 0 : stockQuantity}
                  onChange={(e) => setStockQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-sm font-black text-stone-800 focus:ring-2 focus:ring-[#046A47] focus:outline-none disabled:bg-stone-100 disabled:text-stone-400"
                />
                <span className="text-xs font-bold text-stone-500 shrink-0">عبوة متاحة</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-stone-700 block mb-1">
                حالة المنتج بالكتالوج:
              </label>
              <div className="flex items-center gap-2 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 accent-[#046A47] rounded cursor-pointer"
                  />
                  <span>تفعيل ظهور المنتج في الكتالوج والبحث</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. CORE PRODUCT DETAILS (الاسم والشركة والأقسام) */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3.5">
            <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5 pb-2 border-b border-stone-100">
              <Tag className="w-4 h-4 text-[#046A47]" />
              <span>البيانات الأساسية للمنتج</span>
            </h4>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">اسم المنتج التجاري *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم المنتج..."
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-2 text-sm font-black text-stone-900 focus:ring-2 focus:ring-[#046A47] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">الشركة المصنعة *</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:ring-2 focus:ring-[#046A47] focus:outline-none"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">القسم الرئيسي *</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    const nextCatId = e.target.value;
                    setCategoryId(nextCatId);
                    const validChild = getUnifiedSubCategoriesForSelection(
                      categories,
                      nextCatId,
                      companyId,
                      subCategories
                    ).some((s) => s.id === subCategoryId);
                    if (!validChild) setSubCategoryId('');
                  }}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:ring-2 focus:ring-[#046A47] focus:outline-none"
                >
                  {mainCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {subCats.length > 0 && (
              <div>
                <label className="text-xs font-bold text-amber-900 block mb-1">
                  القسم الفرعي (اختياري):
                </label>
                <select
                  value={subCategoryId}
                  onChange={(e) => setSubCategoryId(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">— عام داخل القسم الرئيسي —</option>
                  {subCats.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      ↳ {sub.name} {sub.source === 'company' ? '(تابع للشركة)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                الوصف المختصر (يظهر على كارت المنتج):
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="وصف مختصر في سطر أو سطرين..."
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-800 focus:ring-2 focus:ring-[#046A47] focus:outline-none"
              />
            </div>
          </div>

          {/* 3. PACKAGES & PRICES (العبوات والأسعار) */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#046A47]" />
                <span>أحجام العبوات والأسعار بالجنيه المصري</span>
              </h4>
              <button
                type="button"
                onClick={handleAddPackage}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ عبوة جديدة</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {productPackages.map((pkg, idx) => (
                <div
                  key={pkg.id || idx}
                  className="p-3 bg-[#FAF8F5] rounded-xl border border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5"
                >
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 block mb-0.5">اسم العبوة:</span>
                      <input
                        type="text"
                        value={pkg.displayName}
                        onChange={(e) => handleUpdatePackage(pkg.id, 'displayName', e.target.value)}
                        placeholder="مثال: 1 لتر"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-stone-500 block mb-0.5">سعر البيع (ج.م):</span>
                      <input
                        type="number"
                        min="0"
                        value={pkg.price === 0 ? '' : pkg.price}
                        placeholder="0"
                        onChange={(e) =>
                          handleUpdatePackage(
                            pkg.id,
                            'price',
                            e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
                          )
                        }
                        className={`w-full bg-white border rounded-lg px-2.5 py-1 text-xs font-black text-[#046A47] focus:outline-none focus:ring-1 focus:ring-[#046A47] ${
                          !pkg.price || pkg.price <= 0 ? 'border-rose-400 bg-rose-50/50 text-rose-700' : 'border-stone-300'
                        }`}
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-stone-500 block mb-0.5">الكمية والوحدة:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={pkg.quantity}
                          onChange={(e) =>
                            handleUpdatePackage(pkg.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-12 bg-white border border-stone-300 rounded-lg px-1.5 py-1 text-center text-xs font-bold text-stone-900"
                        />
                        <input
                          type="text"
                          value={pkg.unit}
                          onChange={(e) => handleUpdatePackage(pkg.id, 'unit', e.target.value)}
                          className="w-12 bg-white border border-stone-300 rounded-lg px-1.5 py-1 text-center text-[11px] text-stone-600"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={productPackages.length <= 1}
                    onClick={() => handleRemovePackage(pkg.id)}
                    className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed self-end sm:self-center"
                    title="حذف العبوة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. PRODUCT IMAGE (صورة المنتج والمعاينة والتدوير) */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3">
            <h4 className="text-xs font-black text-stone-900 flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>صورة المنتج أو العبوة وضبط الاستقامة</span>
              </span>
              {mainImageUrl && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  يمكنك تدوير وضبط اتجاه الصورة فوراً
                </span>
              )}
            </h4>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group/qimg w-24 h-24 rounded-2xl border-2 border-stone-200 bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:10px_10px] overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                {mainImageUrl ? (
                  <img src={mainImageUrl} alt={name} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-xs text-stone-400 font-bold">بدون صورة</span>
                )}
                {mainImageUrl && (
                  <button
                    type="button"
                    disabled={isRotating || isUploading}
                    onClick={() => handleRotate(90)}
                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/qimg:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[10px] font-black cursor-pointer"
                    title="اضغط لتدوير الصورة 90°"
                  >
                    <RotateCw className={`w-4 h-4 ${isRotating ? 'animate-spin' : ''}`} />
                    <span>تدوير 90°</span>
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2.5 w-full">
                <input
                  type="text"
                  value={mainImageUrl}
                  onChange={(e) => setMainImageUrl(e.target.value)}
                  placeholder="رابط الصورة (URL أو Data URL)..."
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#046A47]" /> : <Upload className="w-3.5 h-3.5 text-stone-600" />}
                    <span>{isUploading ? 'جاري الرفع...' : 'رفع صورة من جهازك'}</span>
                  </button>

                  {mainImageUrl && (
                    <>
                      <button
                        type="button"
                        disabled={isRotating || isUploading}
                        onClick={() => handleRotate(90)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-200 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        title="تدوير الصورة 90° لليمين لضبط الاستقامة الأفقية/الرأسية"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                        <span>{isRotating ? 'جاري التدوير...' : 'تدوير 90°'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isRotating || isUploading}
                        onClick={() => handleRotate(-90)}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center disabled:opacity-50"
                        title="تدوير 90° لليسار"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isCleaningBg || isUploading}
                        onClick={handleCleanBg}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="إزالة خلفية الصورة بدقة فائقة مع الحفاظ على جسم وبيانات المنتج"
                      >
                        {isCleaningBg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-600" />}
                        <span>{isCleaningBg ? 'جاري التفريغ...' : 'تفريغ دقيق للخلفية'}</span>
                      </button>

                      {originalImageBeforeClean && (
                        <button
                          type="button"
                          onClick={handleRestoreOriginal}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                          title="استعادة الصورة الأصلية كما كانت قبل التفريغ"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>استعادة الأصل</span>
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const sampleImg = getAgriculturalProductImage(name);
                      setMainImageUrl(sampleImg);
                      onShowToast('تم اختيار صورة زراعية مناسبة للمنتج ✓', 'success');
                    }}
                    className="px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                  >
                    🌱 صورة مقترحة
                  </button>

                  {mainImageUrl && (
                    <button
                      type="button"
                      onClick={() => setMainImageUrl('')}
                      className="px-2 py-1.5 text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-black cursor-pointer transition-colors"
          >
            إلغاء التعديل
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#046A47] hover:bg-[#035136] text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer transition-all"
          >
            <Save className="w-4 h-4 text-amber-300" />
            <span>حفظ التعديلات والتحديث الفوري ✓</span>
          </button>
        </div>
      </div>
    </div>
  );
};
