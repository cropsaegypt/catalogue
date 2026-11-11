import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Percent,
  Sprout,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  Save,
  Eye,
  EyeOff,
  Tag,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import {
  CatalogSettings,
  Category,
  Company,
  HomeShowcaseItem,
  HomeShowcaseKey,
  HomeShowcaseSection,
  Package,
  Product,
} from '../../types';
import {
  HOME_SHOWCASE_ORDER,
  computeShowcasePricing,
  resolveHomeShowcases,
} from '../../utils/homeShowcases';
import { FALLBACK_BOTTLE_SVG_DATA_URL } from '../../utils/agriculturalImages';
import { getMainCategories, getProductMainCategoryId } from '../../utils/categoryHierarchy';

interface HomeShowcasesManagerProps {
  settings: CatalogSettings;
  products: Product[];
  packages: Package[];
  companies: Company[];
  categories: Category[];
  onSaveSettings: (settings: CatalogSettings) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

const SECTION_META: Record<
  HomeShowcaseKey,
  { icon: React.ReactNode; chipClass: string; activeCardClass: string }
> = {
  latest: {
    icon: <Sparkles className="w-4 h-4" />,
    chipClass: 'bg-emerald-100 text-[#046A47] border-emerald-300',
    activeCardClass: 'border-[#046A47] bg-emerald-50/70 ring-2 ring-emerald-500/25',
  },
  merchant_deals: {
    icon: <Percent className="w-4 h-4" />,
    chipClass: 'bg-rose-100 text-rose-800 border-rose-300',
    activeCardClass: 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/25',
  },
  seasonal: {
    icon: <Sprout className="w-4 h-4" />,
    chipClass: 'bg-sky-100 text-sky-800 border-sky-300',
    activeCardClass: 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-500/25',
  },
};

export const HomeShowcasesManager: React.FC<HomeShowcasesManagerProps> = ({
  settings,
  products,
  packages,
  companies,
  categories,
  onSaveSettings,
  onShowToast,
}) => {
  const [sectionsMap, setSectionsMap] = useState<Record<HomeShowcaseKey, HomeShowcaseSection>>(() => {
    const resolved = resolveHomeShowcases(settings, products);
    return {
      latest: resolved[0],
      merchant_deals: resolved[1],
      seasonal: resolved[2],
    };
  });

  useEffect(() => {
    const resolved = resolveHomeShowcases(settings, products);
    setSectionsMap({
      latest: resolved[0],
      merchant_deals: resolved[1],
      seasonal: resolved[2],
    });
  }, [settings, products]);

  const [selectedKey, setSelectedKey] = useState<HomeShowcaseKey>('merchant_deals');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCompanyId, setPickerCompanyId] = useState('ALL');
  const [pickerCategoryId, setPickerCategoryId] = useState('ALL');

  const activeSection = sectionsMap[selectedKey];

  const persistMap = (nextMap: Record<HomeShowcaseKey, HomeShowcaseSection>, toastMsg?: string) => {
    setSectionsMap(nextMap);
    onSaveSettings({
      ...settings,
      homeShowcases: nextMap,
    });
    if (toastMsg) {
      onShowToast(toastMsg, 'success');
    }
  };

  const updateCurrentSection = (
    updater: (prev: HomeShowcaseSection) => HomeShowcaseSection,
    toastMsg?: string
  ) => {
    const updated = updater({ ...activeSection, customized: true });
    const nextMap = { ...sectionsMap, [selectedKey]: updated };
    persistMap(nextMap, toastMsg);
  };

  const handleAddProductToSection = (product: Product) => {
    if (activeSection.items.some((it) => it.productId === product.id)) {
      onShowToast(`"${product.name}" موجود بالفعل داخل هذا المربع`, 'error');
      return;
    }

    const newItem: HomeShowcaseItem = {
      id: `HS-${selectedKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      discountPercent: selectedKey === 'merchant_deals' ? 10 : 0,
      discountLabel: selectedKey === 'merchant_deals' ? 'عرض خاص للتجار' : '',
      note: '',
    };

    updateCurrentSection(
      (sec) => ({ ...sec, items: [...sec.items, newItem] }),
      `تمت إضافة "${product.name}" إلى "${activeSection.title}"`
    );
  };

  const handleUpdateItem = (itemId: string, patch: Partial<HomeShowcaseItem>) => {
    const nextItems = activeSection.items.map((it) =>
      it.id === itemId ? { ...it, ...patch } : it
    );
    const updated = { ...activeSection, customized: true, items: nextItems };
    setSectionsMap({ ...sectionsMap, [selectedKey]: updated });
  };

  const handleSaveAll = () => {
    onSaveSettings({
      ...settings,
      homeShowcases: {
        ...sectionsMap,
        [selectedKey]: { ...activeSection, customized: true },
      },
    });
    onShowToast(`تم حفظ وتحديث "${activeSection.title}" ومزامنته مع الصفحة الرئيسية بنجاح`, 'success');
  };

  const handleRemoveItem = (itemId: string) => {
    updateCurrentSection(
      (sec) => ({ ...sec, items: sec.items.filter((it) => it.id !== itemId) }),
      'تم إزالة المنتج من المربع'
    );
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= activeSection.items.length) return;
    const copy = [...activeSection.items];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    updateCurrentSection((sec) => ({ ...sec, items: copy }));
  };

  const pickerProducts = products.filter((p) => {
    if (!p.active) return false;
    const q = pickerSearch.trim().toLowerCase();
    const matchesSearch =
      !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    const matchesComp = pickerCompanyId === 'ALL' || p.companyId === pickerCompanyId;
    const matchesCat =
      pickerCategoryId === 'ALL' ||
      getProductMainCategoryId(p, categories) === pickerCategoryId;
    return matchesSearch && matchesComp && matchesCat;
  });

  const existingIdsSet = new Set(activeSection.items.map((it) => it.productId));

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Header */}
      <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#046A47]" />
            <span>إدارة مربعات الرئيسية الـ 3 (أحدث المنتجات • عروض التجار • منتجات الموسم)</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium mt-1">
            تحكم كامل في المنتجات المعروضة داخل كل مربع تحت الشريط الرئيسي، مع كتابة الخصم ونص العرض وترتيب الظهور.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs px-5 py-3 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>حفظ ومزامنة مع المتجر</span>
        </button>
      </div>

      {/* 3 Section Switcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HOME_SHOWCASE_ORDER.map((key) => {
          const sec = sectionsMap[key];
          const meta = SECTION_META[key];
          const isSelected = selectedKey === key;
          const discountedCount = sec.items.filter(
            (it) => (Number(it.discountPercent) || 0) > 0 || Boolean(it.discountLabel?.trim())
          ).length;

          return (
            <div
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`rounded-2xl border-2 p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 bg-white ${
                isSelected ? meta.activeCardClass : 'border-[#E5E2D9] hover:border-[#046A47]/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded-xl border ${meta.chipClass}`}>{meta.icon}</span>
                  <div>
                    <h3 className="text-sm font-black text-[#2D2D24]">{sec.title}</h3>
                    <span className="text-[11px] font-bold text-[#8A8A6D]">
                      {sec.items.length} منتجات {discountedCount > 0 ? `• ${discountedCount} بخصم` : ''}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextMap = {
                      ...sectionsMap,
                      [key]: { ...sec, customized: true, enabled: !sec.enabled },
                    };
                    persistMap(
                      nextMap,
                      !sec.enabled ? `تم تفعيل إظهار "${sec.title}"` : `تم إخفاء "${sec.title}" مؤقتاً`
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer border ${
                    sec.enabled
                      ? 'bg-emerald-50 text-[#046A47] border-emerald-200'
                      : 'bg-stone-100 text-stone-500 border-stone-200'
                  }`}
                >
                  {sec.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{sec.enabled ? 'ظاهر للعملاء' : 'مخفي'}</span>
                </button>
              </div>

              <div className="text-[11px] text-stone-600 line-clamp-1 font-medium">
                {sec.subtitle || 'اضغط لتعديل المنتجات والخصومات'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Workspace: Selected Box Settings + Items + Product Picker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right/Main Column (7 cols): Section Header Settings + Curated Items List with Discounts */}
        <div className="lg:col-span-7 space-y-5">
          {/* Box Details Card */}
          <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-3">
              <div className="flex items-center gap-2 font-black text-sm text-[#2D2D24]">
                {SECTION_META[selectedKey].icon}
                <span>إعدادات مربع: {activeSection.title}</span>
              </div>
              <button
                type="button"
                onClick={handleSaveAll}
                className="text-xs font-black bg-[#046A47] text-white px-3.5 py-1.5 rounded-xl hover:bg-[#035237] cursor-pointer"
              >
                حفظ التعديلات
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">عنوان المربع</label>
                <input
                  type="text"
                  value={activeSection.title}
                  onChange={(e) =>
                    setSectionsMap({
                      ...sectionsMap,
                      [selectedKey]: { ...activeSection, customized: true, title: e.target.value },
                    })
                  }
                  className="w-full p-2.5 bg-white border border-[#D4D1C5] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">
                  شارة المربع العلوية (Badge)
                </label>
                <input
                  type="text"
                  value={activeSection.badgeText || ''}
                  onChange={(e) =>
                    setSectionsMap({
                      ...sectionsMap,
                      [selectedKey]: {
                        ...activeSection,
                        customized: true,
                        badgeText: e.target.value,
                      },
                    })
                  }
                  placeholder="مثال: خصم حتى 20%"
                  className="w-full p-2.5 bg-white border border-[#D4D1C5] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#2D2D24] block mb-1">وصف مختصر تحت العنوان</label>
              <input
                type="text"
                value={activeSection.subtitle || ''}
                onChange={(e) =>
                  setSectionsMap({
                    ...sectionsMap,
                    [selectedKey]: { ...activeSection, customized: true, subtitle: e.target.value },
                  })
                }
                placeholder="وصف يوضح نوع العروض أو المنتجات داخل المربع..."
                className="w-full p-2.5 bg-white border border-[#D4D1C5] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47] focus:outline-none"
              />
            </div>
          </div>

          {/* Selected Products Inside This Box */}
          <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#2D2D24]">
                المنتجات وتفاصيل الخصم داخل «{activeSection.title}» ({activeSection.items.length})
              </h3>
              {activeSection.items.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentSection((sec) => ({ ...sec, items: [] }), 'تم تفريغ منتجات المربع')
                  }
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  تفريغ القائمة
                </button>
              )}
            </div>

            {activeSection.items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#D4D1C5] p-8 text-center text-xs font-bold text-[#8A8A6D]">
                لا توجد منتجات مختارة في هذا المربع حالياً — اختر أي منتج من القائمة المجاورة لإضافته!
              </div>
            ) : (
              <div className="space-y-3">
                {activeSection.items.map((item, idx) => {
                  const product = products.find((p) => p.id === item.productId);
                  if (!product) return null;
                  const company = companies.find((c) => c.id === product.companyId);
                  const prodPkgs = packages
                    .filter((pkg) => pkg.productId === product.id && pkg.active)
                    .sort((a, b) => a.displayOrder - b.displayOrder);
                  const firstPkg = prodPkgs[0];
                  const basePrice = firstPkg?.price ?? 0;
                  const pricing = computeShowcasePricing(basePrice, item);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-[#D4D1C5] p-4 space-y-3 shadow-2xs"
                    >
                      {/* Row Header: Image + Name + Order Controls */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                              src={product.mainImageUrl || FALLBACK_BOTTLE_SVG_DATA_URL}
                              alt={product.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-xs sm:text-sm text-[#2D2D24] truncate">
                              {product.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8A8A6D] font-bold">
                              <span>{company?.name || 'كروپسا'}</span>
                              {firstPkg && (
                                <span className="text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                                  {firstPkg.displayName}:{' '}
                                  {pricing.discountPercent > 0 ? (
                                    <>
                                      <span className="line-through text-stone-400 mr-1">
                                        {pricing.originalPrice} ج
                                      </span>{' '}
                                      <span className="text-[#046A47] font-black">
                                        {pricing.finalPrice} ج.م
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-black">{basePrice} ج.م</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(idx, -1)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-35 cursor-pointer"
                            title="تقديم للأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeSection.items.length - 1}
                            onClick={() => handleMoveItem(idx, 1)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-35 cursor-pointer"
                            title="تأخير للأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="إزالة من المربع"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Discount & Promo Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-100">
                        <div>
                          <label className="text-[10.5px] font-bold text-[#046A47] block mb-1">
                            نسبة الخصم (%)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={95}
                            value={item.discountPercent ?? 0}
                            onChange={(e) =>
                              handleUpdateItem(item.id, {
                                discountPercent: Math.max(0, Math.min(95, Number(e.target.value) || 0)),
                              })
                            }
                            placeholder="0"
                            className="w-full p-2 bg-[#F9F8F6] border border-[#D4D1C5] rounded-xl text-xs font-black text-rose-700 focus:ring-2 focus:ring-[#046A47] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-[#2D2D24] block mb-1">
                            عنوان / شارة الخصم
                          </label>
                          <input
                            type="text"
                            value={item.discountLabel || ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { discountLabel: e.target.value })
                            }
                            placeholder="مثال: خصم 15% للتجار"
                            className="w-full p-2 bg-[#F9F8F6] border border-[#D4D1C5] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10.5px] font-bold text-[#2D2D24] block mb-1">
                            ملاحظة أو شرط العرض
                          </label>
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => handleUpdateItem(item.id, { note: e.target.value })}
                            placeholder="مثال: لطلبات +5 كراتين"
                            className="w-full p-2 bg-[#F9F8F6] border border-[#D4D1C5] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#046A47] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Left Column (5 cols): Interactive Product Picker to Add Anything Freely */}
        <div className="lg:col-span-5 bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4 sticky top-4">
          <div>
            <h3 className="text-sm font-black text-[#2D2D24]">
              اختيار وإضافة منتجات إلى «{activeSection.title}»
            </h3>
            <p className="text-[11px] text-[#8A8A6D] font-medium mt-0.5">
              ابحث أو صفِّ حسب الشركة والقسم وأضف أي منتج بضغطة زر
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8A8A6D] absolute right-3 top-2.5" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="بحث باسم المنتج أو الكود..."
                className="w-full pr-9 pl-3 py-2 bg-white border border-[#D4D1C5] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={pickerCompanyId}
                onChange={(e) => setPickerCompanyId(e.target.value)}
                className="bg-white border border-[#D4D1C5] rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
              >
                <option value="ALL">كل الشركات</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={pickerCategoryId}
                onChange={(e) => setPickerCategoryId(e.target.value)}
                className="bg-white border border-[#D4D1C5] rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none"
              >
                <option value="ALL">كل الأقسام</option>
                {getMainCategories(categories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
            {pickerProducts.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#8A8A6D] font-bold">
                لا توجد منتجات مطابقة للبحث
              </div>
            ) : (
              pickerProducts.map((prod) => {
                const isAdded = existingIdsSet.has(prod.id);
                const comp = companies.find((c) => c.id === prod.companyId);
                const firstPkg = packages.find((pkg) => pkg.productId === prod.id && pkg.active);

                return (
                  <div
                    key={prod.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                      isAdded
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-white border-[#E5E2D9] hover:border-[#046A47]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-200 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={prod.mainImageUrl || FALLBACK_BOTTLE_SVG_DATA_URL}
                          alt={prod.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#2D2D24] truncate">{prod.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-[#8A8A6D] font-bold">
                          <span className="inline-flex items-center gap-0.5 truncate">
                            <Building2 className="w-2.5 h-2.5 shrink-0" />
                            <span>{comp?.name || 'كروپسا'}</span>
                          </span>
                          {firstPkg && (
                            <span className="text-[#046A47] font-black shrink-0">
                              {firstPkg.displayName} / {firstPkg.price} ج
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAdded ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#046A47] bg-white border border-emerald-200 px-2.5 py-1.5 rounded-xl shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مضاف</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddProductToSection(prod)}
                        className="inline-flex items-center gap-1 text-[11px] font-black bg-[#046A47] hover:bg-[#035237] text-white px-3 py-1.5 rounded-xl cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
