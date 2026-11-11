import React, { useState } from 'react';
import {
  Package as PackageIcon,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  Image as ImageIcon,
  DollarSign,
  Sparkles,
  Layers,
  Search,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';

import { Product, Package, Company, Category, CompanyImage } from '../../types';
import { ImageFileInput } from '../common/ImageFileInput';
import { AGRICULTURAL_PRESET_IMAGES, getAgriculturalProductImage } from '../../utils/agriculturalImages';
import { aiCatalogService } from '../../services/aiCatalogService';
import { inferAgronomySearchTags } from '../../utils/agriculturalSearch';

interface ProductManagerProps {
  products: Product[];
  packages: Package[];
  companies: Company[];
  categories: Category[];
  companyImages: CompanyImage[];
  onSaveProducts: (products: Product[]) => void;
  onSavePackages: (packages: Package[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  products = [],
  packages = [],
  companies = [],
  categories = [],
  companyImages = [],
  onSaveProducts,
  onSavePackages,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('ALL');
  const [filterCategoryId, setFilterCategoryId] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'content' | 'packages' | 'image'>('basic');

  // Form State
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [characteristics, setCharacteristics] = useState<string[]>(['']);
  const [composition, setComposition] = useState<string[]>(['']);
  const [usage, setUsage] = useState<string[]>(['']);
  const [searchTagsText, setSearchTagsText] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [isCleaningAllBg, setIsCleaningAllBg] = useState(false);

  // Dynamic Packages for this product
  const [formPackages, setFormPackages] = useState<
    {
      id: string;
      quantity: number;
      unit: string;
      displayName: string;
      price: number;
      costPrice?: number;
      stockQuantity?: number;
      minStockAlert?: number;
    }[]
  >([]);

  // Filtered Products List
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filterCompanyId === 'ALL' || p.companyId === filterCompanyId;
    const matchesCategory = filterCategoryId === 'ALL' || p.categoryId === filterCategoryId;
    return matchesSearch && matchesCompany && matchesCategory;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    const newId = 'PROD-' + Date.now().toString().slice(-4);
    setProductId(newId);
    setName('');
    setCompanyId(companies.length > 0 ? companies[0].id : '');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setShortDescription('');
    setDescription('');
    setCharacteristics(['']);
    setComposition(['']);
    setUsage(['']);
    setSearchTagsText('');
    setMainImageUrl('');
    setActive(true);
    setFeatured(false);

    setFormPackages([
      {
        id: `${newId}-1L`,
        quantity: 1,
        unit: 'لتر',
        displayName: '1 لتر',
        price: 200,
        costPrice: 150,
        stockQuantity: 50,
        minStockAlert: 10,
      },
    ]);

    setActiveFormTab('basic');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setProductId(p.id);
    setName(p.name);
    setCompanyId(p.companyId);
    setCategoryId(p.categoryId);
    setShortDescription(p.shortDescription || '');
    setDescription(p.description || '');
    setCharacteristics(p.characteristics && p.characteristics.length > 0 ? p.characteristics : ['']);
    setComposition(p.composition && p.composition.length > 0 ? p.composition : ['']);
    setUsage(p.usage && p.usage.length > 0 ? p.usage : ['']);
    setSearchTagsText(p.searchTags && p.searchTags.length > 0 ? p.searchTags.join(' ، ') : '');
    setMainImageUrl(p.mainImageUrl || '');
    setActive(p.active);
    setFeatured(p.featured || false);

    const productPackages = packages.filter((pkg) => pkg.productId === p.id);
    if (productPackages.length > 0) {
      setFormPackages(
        productPackages.map((pkg) => ({
          id: pkg.id,
          quantity: pkg.quantity,
          unit: pkg.unit,
          displayName: pkg.displayName,
          price: pkg.price,
          costPrice: pkg.costPrice ?? Math.round(pkg.price * 0.75),
          stockQuantity: pkg.stockQuantity ?? 50,
          minStockAlert: pkg.minStockAlert ?? 10,
        }))
      );
    } else {
      setFormPackages([
        {
          id: `${p.id}-1L`,
          quantity: 1,
          unit: 'لتر',
          displayName: '1 لتر',
          price: 200,
          costPrice: 150,
          stockQuantity: 50,
          minStockAlert: 10,
        },
      ]);
    }

    setActiveFormTab('basic');
    setIsModalOpen(true);
  };

  const handleDuplicate = (p: Product) => {
    const newId = `${p.id}-COPY-${Math.floor(Math.random() * 100)}`;
    const duplicatedProduct: Product = {
      ...p,
      id: newId,
      name: `${p.name} (نسخة)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sourcePackages = packages.filter((pkg) => pkg.productId === p.id);
    const duplicatedPackages: Package[] = sourcePackages.map((pkg, idx) => ({
      ...pkg,
      id: `${newId}-PKG-${idx + 1}`,
      productId: newId,
    }));

    onSaveProducts([duplicatedProduct, ...products]);
    onSavePackages([...packages, ...duplicatedPackages]);
    onShowToast(`تم تكرار المنتج برقم جديد: ${newId}`, 'success');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId.trim() || !name.trim()) {
      alert('يرجى ملء كافة البيانات المطلوبة');
      return;
    }

    const cleanChars = characteristics.filter((c) => c.trim() !== '');
    const cleanComp = composition.filter((c) => c.trim() !== '');
    const cleanUsage = usage.filter((u) => u.trim() !== '');
    const manualSearchTags = searchTagsText
      .split(/[،,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const categoryNameForTags = categories.find((c) => c.id === categoryId)?.name || '';
    const resolvedSearchTags =
      manualSearchTags.length > 0
        ? manualSearchTags
        : inferAgronomySearchTags({
            name,
            shortDescription,
            description,
            characteristics: cleanChars,
            composition: cleanComp,
            usage: cleanUsage,
            categoryName: categoryNameForTags,
          });

    const finalImage =
      mainImageUrl.trim() !== ''
        ? mainImageUrl
        : getAgriculturalProductImage(name, categoryNameForTags);

    let updatedProducts: Product[];

    if (editingProduct) {
      updatedProducts = products.map((pr) =>
        pr.id === editingProduct.id
          ? {
              ...pr,
              id: productId,
              name,
              companyId,
              categoryId,
              shortDescription,
              description,
              characteristics: cleanChars,
              composition: cleanComp,
              usage: cleanUsage,
              searchTags: resolvedSearchTags,
              mainImageUrl: finalImage,
              active,
              featured,
              allowCartonOrder: false,
              piecesPerCarton: 1,
              updatedAt: new Date().toISOString(),
            }
          : pr
      );
    } else {
      const newProduct: Product = {
        id: productId,
        companyId,
        categoryId,
        name,
        shortDescription,
        description,
        characteristics: cleanChars,
        composition: cleanComp,
        usage: cleanUsage,
        searchTags: resolvedSearchTags,
        mainImageUrl: finalImage,
        displayOrder: products.length + 1,
        active,
        featured,
        allowPieceOrder: true,
        allowCartonOrder: false,
        piecesPerCarton: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedProducts = [newProduct, ...products];
    }

    // Save Packages
    const otherPackages = packages.filter((pkg) => pkg.productId !== (editingProduct ? editingProduct.id : productId));
    const newPackages: Package[] = formPackages.map((pkg, idx) => ({
      id: pkg.id || `${productId}-PKG-${idx + 1}`,
      productId,
      quantity: pkg.quantity,
      unit: pkg.unit,
      displayName: pkg.displayName,
      price: pkg.price,
      costPrice: pkg.costPrice ?? Math.round(pkg.price * 0.75),
      stockQuantity: pkg.stockQuantity ?? 50,
      minStockAlert: pkg.minStockAlert ?? 10,
      currency: 'EGP',
      allowPieceOrder: true,
      allowCartonOrder: false,
      piecesPerCarton: 1,
      active: true,
      displayOrder: idx + 1,
    }));

    onSaveProducts(updatedProducts);
    onSavePackages([...otherPackages, ...newPackages]);
    onShowToast(editingProduct ? 'تم حفظ التعديلات' : 'تم إضافة المنتج والعبوات بنجاح', 'success');
    setIsModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm(`هل تريد تأكيد حذف المنتج (${id}) وكافة عبواته؟`)) {
      onSaveProducts(products.filter((p) => p.id !== id));
      onSavePackages(packages.filter((pkg) => pkg.productId !== id));
      onShowToast('تم حذف المنتج بنجاح', 'success');
    }
  };

  // Company specific images for gallery selector
  const availableCompanyImages = companyImages.filter((img) => img.companyId === companyId);

  const handleBatchCleanBackgrounds = async () => {
    const candidates = filteredProducts.filter((p) => {
      const url = p.mainImageUrl || '';
      return (
        url &&
        !url.startsWith('data:image/svg+xml') &&
        !url.includes('unsplash.com') &&
        !url.includes('pexels.com')
      );
    });
    if (candidates.length === 0) {
      onShowToast('لا توجد صور منتجات مطابقة قابلة لإزالة الخلفية', 'error');
      return;
    }

    setIsCleaningAllBg(true);
    try {
      const updatedMap = new Map<string, string>();
      for (const prod of candidates) {
        const cleaned = await aiCatalogService.cleanBackgroundAndUpload(
          prod.mainImageUrl!,
          `prd-${prod.id}`
        );
        if (cleaned) {
          updatedMap.set(prod.id, cleaned);
        }
      }

      if (updatedMap.size === 0) {
        onShowToast('الصور مفرّغة بالفعل أو لا تحتوي على خلفية موحدة للإزالة', 'error');
        return;
      }

      const nextProducts = products.map((p) =>
        updatedMap.has(p.id)
          ? { ...p, mainImageUrl: updatedMap.get(p.id), updatedAt: new Date().toISOString() }
          : p
      );
      onSaveProducts(nextProducts);
      onShowToast(`تم تفريغ وإزالة الخلفية لـ ${updatedMap.size} منتج وحفظهم بنجاح`, 'success');
    } finally {
      setIsCleaningAllBg(false);
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <PackageIcon className="w-5 h-5 text-[#5A5A40]" />
            <span>إدارة المنتجات والعبوات ({products.length})</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium">إضافة المنتجات وتحديد الحجم والأسعار والمعلومات الفنية</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isCleaningAllBg}
            onClick={handleBatchCleanBackgrounds}
            className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-[#046A47] border border-emerald-200 px-3.5 py-2.5 rounded-xl text-xs font-black shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="يزيل الخلفية البيضاء أو الرمادية تلقائياً لصور المنتجات المعروضة حالياً"
          >
            {isCleaningAllBg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isCleaningAllBg ? 'جاري تفريغ الصور...' : 'إزالة خلفيات المنتجات'}</span>
          </button>

          <button
            onClick={openAddModal}
            className="bg-[#5A5A40] hover:bg-[#484833] text-[#F9F8F6] px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-[#E5E2D9] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-[#8A8A6D] absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالكود أو اسم المنتج..."
            className="w-full pr-9 pl-3 py-2 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value)}
            className="bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl px-3 py-2 text-xs font-semibold"
          >
            <option value="ALL">كل الشركات</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl px-3 py-2 text-xs font-semibold"
          >
            <option value="ALL">كل الأقسام</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#2D2D24] text-[#F9F8F6] text-xs font-bold">
              <tr>
                <th className="p-3.5">الكود (ID)</th>
                <th className="p-3.5">اسم المنتج</th>
                <th className="p-3.5">الشركة</th>
                <th className="p-3.5">القسم</th>
                <th className="p-3.5">العبوات والأسعار</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2D9]">
              {filteredProducts.map((p) => {
                const comp = companies.find((c) => c.id === p.companyId);
                const cat = categories.find((c) => c.id === p.categoryId);
                const prodPackages = packages.filter((pkg) => pkg.productId === p.id && pkg.active);

                return (
                  <tr key={p.id} className="hover:bg-[#F1EFEC]/80 transition-colors">
                    <td className="p-3.5 font-mono text-xs font-bold text-[#2D2D24]">{p.id}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={p.mainImageUrl || 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=100&auto=format&fit=crop&q=80'}
                          alt={p.name}
                          className="w-9 h-9 object-contain rounded-lg border border-[#D4D1C5] bg-white p-0.5"
                        />
                        <div>
                          <span className="font-black text-[#2D2D24] block">{p.name}</span>
                          <span className="text-[11px] text-[#8A8A6D] line-clamp-1">{p.shortDescription}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-[#5A5A40]">{comp?.name || '-'}</td>
                    <td className="p-3.5 text-xs font-semibold text-[#5A5A40]">{cat?.name || '-'}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {prodPackages.map((pkg) => (
                          <span
                            key={pkg.id}
                            className="bg-[#E5E2D9] text-[#2D2D24] border border-[#D4D1C5] text-[11px] font-bold px-2 py-0.5 rounded-md"
                          >
                            {pkg.displayName}: {pkg.price} ج
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="p-1.5 bg-[#E5E2D9] hover:bg-[#D4D1C5] text-[#2D2D24] rounded-lg"
                          title="نسخ المنتج"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 bg-[#5A5A40] hover:bg-[#484833] text-[#F9F8F6] rounded-lg"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 bg-amber-900/10 hover:bg-amber-900/20 text-amber-900 rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabbed Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 dir-rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-emerald-950">
                {editingProduct ? `تعديل المنتج (${productId})` : 'إضافة منتج جديد'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Nav Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-5 gap-2">
              <button
                type="button"
                onClick={() => setActiveFormTab('basic')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeFormTab === 'basic'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                1. البيانات الأساسية
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('content')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeFormTab === 'content'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                2. الخصائص والتركيب والاستخدام
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('packages')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeFormTab === 'packages'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                3. العبوات والأسعار
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('image')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeFormTab === 'image'
                    ? 'border-emerald-600 text-emerald-800 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                4. اختيار الصورة
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 flex-1">
              {/* Tab 1: Basic */}
              {activeFormTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">كود المنتج الفريد (Product ID) *</label>
                      <input
                        type="text"
                        required
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        placeholder="مثال: KIMA-001"
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">اسم المنتج التجاري *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثال: سولوبوتاس"
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">الشركة المصنعة *</label>
                      <select
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">القسم الرئيسي *</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">وصف مختصر يظهر بالبطاقة *</label>
                    <input
                      type="text"
                      required
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="وصف ملخص في سطرين..."
                      className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">الوصف التفصيلي الكامل</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="شرح كامل للمنتج وآلية عمله..."
                      className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Technical Content */}
              {activeFormTab === 'content' && (
                <div className="space-y-4">
                  {/* Characteristics */}
                  <div>
                    <label className="text-xs font-bold text-emerald-950 block mb-1">أبرز الخصائص والفوائد:</label>
                    {characteristics.map((char, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={char}
                          onChange={(e) => {
                            const updated = [...characteristics];
                            updated[i] = e.target.value;
                            setCharacteristics(updated);
                          }}
                          placeholder="خاصية مميزة..."
                          className="flex-1 p-2.5 border border-gray-300 rounded-xl text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setCharacteristics(characteristics.filter((_, idx) => idx !== i))}
                          className="px-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCharacteristics([...characteristics, ''])}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      + إضافة خاصية جديدة
                    </button>
                  </div>

                  {/* Composition */}
                  <div>
                    <label className="text-xs font-bold text-slate-900 block mb-1">التركيب الكيميائي والعناصر:</label>
                    {composition.map((comp, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={comp}
                          onChange={(e) => {
                            const updated = [...composition];
                            updated[i] = e.target.value;
                            setComposition(updated);
                          }}
                          placeholder="مثال: بوتاسيوم K2O بنسبة 50%"
                          className="flex-1 p-2.5 border border-gray-300 rounded-xl text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setComposition(composition.filter((_, idx) => idx !== i))}
                          className="px-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setComposition([...composition, ''])}
                      className="text-xs font-bold text-slate-700 hover:underline"
                    >
                      + إضافة عنصر تركيب
                    </button>
                  </div>

                  {/* Usage */}
                  <div>
                    <label className="text-xs font-bold text-blue-900 block mb-1">معدلات الاستخدام والتطبيق:</label>
                    {usage.map((use, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={use}
                          onChange={(e) => {
                            const updated = [...usage];
                            updated[i] = e.target.value;
                            setUsage(updated);
                          }}
                          placeholder="مثال: الرش الورقي 250 سم3 / 100 لتر ماء"
                          className="flex-1 p-2.5 border border-gray-300 rounded-xl text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setUsage(usage.filter((_, idx) => idx !== i))}
                          className="px-3 bg-red-100 text-red-700 rounded-xl text-xs font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUsage([...usage, ''])}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      + إضافة طريقة استخدام
                    </button>
                  </div>

                  {/* Hidden Search Tags */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-amber-950 block">
                        وسوم بحث مخفية (لا تظهر على الكارت للعميل — لربط الآفات والمحاصيل بالبحث السريع):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const existingTags = searchTagsText
                            .split(/[،,\n]+/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                          const generated = inferAgronomySearchTags({
                            name,
                            shortDescription,
                            description,
                            characteristics: characteristics.filter((c) => c.trim() !== ''),
                            composition: composition.filter((c) => c.trim() !== ''),
                            usage: usage.filter((u) => u.trim() !== ''),
                            categoryName: categories.find((c) => c.id === categoryId)?.name || '',
                            searchTags: existingTags,
                          });
                          setSearchTagsText(generated.join(' ، '));
                        }}
                        className="text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg transition-colors"
                      >
                        ✨ استنتاج تلقائي من الوصف
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={searchTagsText}
                      onChange={(e) => setSearchTagsText(e.target.value)}
                      placeholder="مثال: دودة ، ديدان ، طماطم ، بطاطس ، حشري ، قاطع الأوراق (اتركه فارغاً للتوليد التلقائي عند الحفظ)"
                      className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Packages */}
              {activeFormTab === 'packages' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">أحجام العبوات والأسعار الخاصة بالمنتج:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormPackages([
                          ...formPackages,
                          {
                            id: `${productId}-${formPackages.length + 1}`,
                            quantity: 1,
                            unit: 'لتر',
                            displayName: 'جديد',
                            price: 100,
                            costPrice: 75,
                            stockQuantity: 50,
                            minStockAlert: 10,
                          },
                        ])
                      }
                      className="bg-emerald-100 hover:bg-emerald-200 text-[#046A47] text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                    >
                      + إضافة عبوة جديدة
                    </button>
                  </div>

                  {formPackages.map((pkg, i) => {
                    const isBelowCost = (pkg.costPrice || 0) > 0 && pkg.price < (pkg.costPrice || 0);
                    const isLowStock = (pkg.stockQuantity ?? 50) <= (pkg.minStockAlert ?? 10);

                    return (
                      <div
                        key={i}
                        className={`p-4 rounded-2xl space-y-3 border transition-all ${
                          isBelowCost
                            ? 'bg-red-50/60 border-red-200'
                            : isLowStock
                            ? 'bg-amber-50/60 border-amber-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-gray-600 block mb-1">اسم العبوة والحجم</label>
                            <input
                              type="text"
                              value={pkg.displayName}
                              onChange={(e) => {
                                const updated = [...formPackages];
                                updated[i].displayName = e.target.value;
                                setFormPackages(updated);
                              }}
                              className="w-full p-2 border rounded-lg text-xs font-bold bg-white"
                              placeholder="مثال: 1 لتر، 500 سم"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#046A47] block mb-1">سعر البيع (جنيه)</label>
                            <input
                              type="number"
                              value={pkg.price}
                              onChange={(e) => {
                                const updated = [...formPackages];
                                updated[i].price = parseFloat(e.target.value) || 0;
                                setFormPackages(updated);
                              }}
                              className={`w-full p-2 border rounded-lg text-xs font-black bg-white ${
                                isBelowCost ? 'border-red-500 text-red-700 ring-2 ring-red-200' : 'text-[#046A47]'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-gray-600 block mb-1">سعر التكلفة (جنيه)</label>
                            <input
                              type="number"
                              value={pkg.costPrice ?? Math.round(pkg.price * 0.75)}
                              onChange={(e) => {
                                const updated = [...formPackages];
                                updated[i].costPrice = parseFloat(e.target.value) || 0;
                                setFormPackages(updated);
                              }}
                              className="w-full p-2 border rounded-lg text-xs font-bold bg-white text-gray-700"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-gray-600 block mb-1">الرصيد بالمخزن</label>
                            <input
                              type="number"
                              value={pkg.stockQuantity ?? 50}
                              onChange={(e) => {
                                const updated = [...formPackages];
                                updated[i].stockQuantity = parseInt(e.target.value) || 0;
                                setFormPackages(updated);
                              }}
                              className={`w-full p-2 border rounded-lg text-xs font-bold bg-white ${
                                isLowStock ? 'border-amber-500 text-amber-800' : 'text-gray-700'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Warnings & Remove button */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/70 text-xs">
                          <div className="flex items-center gap-3">
                            {isBelowCost && (
                              <span className="text-[11px] font-bold text-red-700 flex items-center gap-1">
                                ⚠️ تحذير: سعر البيع أقل من التكلفة بمقدار {(pkg.costPrice || 0) - pkg.price} ج
                              </span>
                            )}
                            {isLowStock && (
                              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                ⚠️ تنبيه: رصيد المخزون قارب على النفاد!
                              </span>
                            )}
                            <span className="text-[11px] text-gray-400 font-mono">ID: {pkg.id}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormPackages(formPackages.filter((_, idx) => idx !== i))}
                            className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                          >
                            حذف العبوة
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 4: Image Picker */}
              {activeFormTab === 'image' && (
                <div className="space-y-5">
                  <ImageFileInput
                    value={mainImageUrl}
                    onChange={setMainImageUrl}
                    label="صورة المنتج الرئيسية (ارفع ملف الصورة أو أدخل رابط مباشر):"
                  />

                  {/* Preset Agricultural Images Gallery */}
                  <div>
                    <label className="text-xs font-bold text-[#046A47] block mb-2">
                      أو اختر بنقرة واحدة من مكتبة الصور الزراعية المجهزة (تلقائي وسريع):
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2.5 border border-[#E5E2D9] rounded-2xl bg-[#FAF8F5]">
                      {AGRICULTURAL_PRESET_IMAGES.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => setMainImageUrl(preset.url)}
                          className={`group p-1 rounded-xl border-2 cursor-pointer transition-all bg-white text-center ${
                            mainImageUrl === preset.url
                              ? 'border-[#046A47] ring-2 ring-emerald-400/40 shadow-xs'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-14 object-contain rounded-lg mb-1"
                          />
                          <span className="text-[10px] font-bold text-[#2D2D24] block truncate">{preset.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Company specific gallery if available */}
                  {availableCompanyImages.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-[#5A5A40] block mb-2">
                        معرض صور الشركة ({availableCompanyImages.length} صور متاحة):
                      </label>
                      <div className="grid grid-cols-4 gap-3 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-2xl">
                        {availableCompanyImages.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => setMainImageUrl(img.url)}
                            className={`p-1 rounded-xl border-2 cursor-pointer transition-all ${
                              mainImageUrl === img.url ? 'border-[#046A47] ring-2 ring-emerald-500/30' : 'border-transparent'
                            }`}
                          >
                            <img src={img.url} alt={img.altText} className="w-full h-16 object-contain rounded-lg" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 rounded-xl text-xs font-bold text-white shadow-md"
                >
                  حفظ المنتج والتغييرات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
