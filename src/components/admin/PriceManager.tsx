import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  History,
  Save,
  Search,
  Filter,
  Building2,
  X,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Package as PackageIcon,
  Layers,
  Zap,
} from 'lucide-react';
import { Product, Package, PriceHistory, Company } from '../../types';
import { SmartPriceUpdateModal } from './SmartPriceUpdateModal';

interface PriceManagerProps {
  products: Product[];
  packages: Package[];
  priceHistory: PriceHistory[];
  companies?: Company[];
  onSavePackages: (packages: Package[]) => void;
  onAddPriceHistory: (entry: Omit<PriceHistory, 'id' | 'createdAt'>) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const PriceManager: React.FC<PriceManagerProps> = ({
  products,
  packages,
  priceHistory,
  companies = [],
  onSavePackages,
  onAddPriceHistory,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'prices' | 'history'>('prices');
  const [editingPriceMap, setEditingPriceMap] = useState<Record<string, number>>({});
  const [isSmartPriceModalOpen, setIsSmartPriceModalOpen] = useState(false);

  // Apply batch price updates from SmartPriceUpdateModal
  const handleApplySmartPriceUpdates = (
    updates: {
      productId: string;
      productName: string;
      packageId: string;
      packageDisplayName: string;
      oldPrice: number;
      newPrice: number;
    }[]
  ) => {
    if (updates.length === 0) return;

    const updateMap = new Map(updates.map((u) => [u.packageId, u.newPrice]));

    const updatedPackages = packages.map((pkg) => {
      if (updateMap.has(pkg.id)) {
        return { ...pkg, price: updateMap.get(pkg.id)! };
      }
      return pkg;
    });

    updates.forEach((u) => {
      onAddPriceHistory({
        productId: u.productId,
        productName: u.productName,
        packageId: u.packageId,
        packageDisplayName: u.packageDisplayName,
        oldPrice: u.oldPrice,
        newPrice: u.newPrice,
        currency: 'EGP',
        source: 'smart_batch',
        updatedBy: 'المدير العام (تحديث ذكي)',
      });
    });

    onSavePackages(updatedPackages);
    onShowToast(`تم اعتماد وتحديث أسعار ${updates.length} عبوة بنجاح في النظام ✓`, 'success');
  };

  // 1. Prices Tab Filters
  const [pricesSearchQuery, setPricesSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [priceStatusFilter, setPriceStatusFilter] = useState<
    'ALL' | 'edited' | 'below_cost' | 'unpriced' | 'out_of_stock'
  >('ALL');

  // 2. History Tab Filters
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedHistoryCompanyId, setSelectedHistoryCompanyId] = useState('ALL');
  const [selectedHistorySource, setSelectedHistorySource] = useState('ALL');

  // Compute counts for companies
  const companyPackageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    packages.forEach((pkg) => {
      const prod = products.find((p) => p.id === pkg.productId);
      if (prod?.companyId) {
        counts[prod.companyId] = (counts[prod.companyId] || 0) + 1;
      }
    });
    return counts;
  }, [packages, products]);

  const companyHistoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    priceHistory.forEach((entry) => {
      const prod = products.find((p) => p.id === entry.productId);
      if (prod?.companyId) {
        counts[prod.companyId] = (counts[prod.companyId] || 0) + 1;
      }
    });
    return counts;
  }, [priceHistory, products]);

  // Edited packages count
  const editedCount = Object.keys(editingPriceMap).filter((id) => {
    const pkg = packages.find((p) => p.id === id);
    return pkg && editingPriceMap[id] !== pkg.price;
  }).length;

  // Below cost count
  const belowCostCount = packages.filter((pkg) => {
    const currentVal = editingPriceMap[pkg.id] !== undefined ? editingPriceMap[pkg.id] : pkg.price;
    const costVal = pkg.costPrice || 0;
    return costVal > 0 && currentVal < costVal;
  }).length;

  const handlePriceChange = (packageId: string, val: number) => {
    setEditingPriceMap({ ...editingPriceMap, [packageId]: val });
  };

  const handleSavePrice = (pkg: Package) => {
    const newPrice = editingPriceMap[pkg.id];
    if (newPrice === undefined || newPrice === pkg.price) return;

    const oldPrice = pkg.price;
    const costPrice = pkg.costPrice || 0;

    if (costPrice > 0 && newPrice < costPrice) {
      const confirmSave = confirm(
        `⚠️ تنبيه هام: السعر الجديد (${newPrice} جنيه) أقل من سعر التكلفة المحددة (${costPrice} جنيه) بمقدار ${
          costPrice - newPrice
        } جنيه!\nهل تريد اعتماد هذا السعر بالرغم من الخسارة؟`
      );
      if (!confirmSave) return;
    }

    const updatedPackages = packages.map((p) => (p.id === pkg.id ? { ...p, price: newPrice } : p));
    const product = products.find((pr) => pr.id === pkg.productId);

    onSavePackages(updatedPackages);
    onAddPriceHistory({
      productId: pkg.productId,
      productName: product ? product.name : pkg.productId,
      packageId: pkg.id,
      packageDisplayName: pkg.displayName,
      oldPrice,
      newPrice,
      currency: pkg.currency || 'EGP',
      source: 'manual',
      updatedBy: 'المدير العام',
    });

    const newMap = { ...editingPriceMap };
    delete newMap[pkg.id];
    setEditingPriceMap(newMap);

    if (costPrice > 0 && newPrice < costPrice) {
      onShowToast(`تم تحديث السعر مع تنبيه: السعر (${newPrice} ج) أقل من التكلفة (${costPrice} ج)`, 'error');
    } else {
      onShowToast(`تم تحديث سعر العبوة ${pkg.displayName} من ${oldPrice} إلى ${newPrice} جنيه`, 'success');
    }
  };

  // Batch save all edited prices
  const handleSaveAllEditedPrices = () => {
    const editedIds = Object.keys(editingPriceMap).filter((id) => {
      const targetPkg = packages.find((p) => p.id === id);
      return targetPkg && editingPriceMap[id] !== targetPkg.price;
    });

    if (editedIds.length === 0) return;

    let belowCostCountLocal = 0;
    editedIds.forEach((id) => {
      const targetPkg = packages.find((p) => p.id === id);
      if (targetPkg && (targetPkg.costPrice || 0) > 0 && editingPriceMap[id] < (targetPkg.costPrice || 0)) {
        belowCostCountLocal++;
      }
    });

    if (belowCostCountLocal > 0) {
      const confirmSave = confirm(
        `⚠️ تنبيه هام: يوجد ${belowCostCountLocal} عبوات بسعر بيع أقل من سعر التكلفة المحددة!\nهل تريد اعتماد وحفظ جميع التعديلات؟`
      );
      if (!confirmSave) return;
    }

    const updatedPackages = packages.map((pkg) => {
      if (editingPriceMap[pkg.id] !== undefined && editingPriceMap[pkg.id] !== pkg.price) {
        return { ...pkg, price: editingPriceMap[pkg.id] };
      }
      return pkg;
    });

    editedIds.forEach((id) => {
      const pkg = packages.find((p) => p.id === id);
      if (!pkg) return;
      const product = products.find((pr) => pr.id === pkg.productId);
      onAddPriceHistory({
        productId: pkg.productId,
        productName: product ? product.name : pkg.productId,
        packageId: pkg.id,
        packageDisplayName: pkg.displayName,
        oldPrice: pkg.price,
        newPrice: editingPriceMap[id],
        currency: pkg.currency || 'EGP',
        source: 'manual',
        updatedBy: 'المدير العام',
      });
    });

    onSavePackages(updatedPackages);
    setEditingPriceMap({});
    onShowToast(`تم حفظ وتحديث أسعار ${editedIds.length} عبوة بنجاح في النظام!`, 'success');
  };

  // Filtered packages for Prices Tab
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const product = products.find((p) => p.id === pkg.productId);
      const company = companies.find((c) => c.id === product?.companyId);

      // 1. Company filter
      if (selectedCompanyId !== 'ALL') {
        if (!product || product.companyId !== selectedCompanyId) {
          return false;
        }
      }

      // 2. Status filter
      const isEdited = editingPriceMap[pkg.id] !== undefined && editingPriceMap[pkg.id] !== pkg.price;
      const currentVal = editingPriceMap[pkg.id] !== undefined ? editingPriceMap[pkg.id] : pkg.price;
      const costVal = pkg.costPrice || 0;
      const isBelowCost = costVal > 0 && currentVal < costVal;
      const isUnpriced = currentVal <= 0;
      const isOutOfStock = Boolean(pkg.isOutOfStock || product?.isOutOfStock);

      if (priceStatusFilter === 'edited' && !isEdited) return false;
      if (priceStatusFilter === 'below_cost' && !isBelowCost) return false;
      if (priceStatusFilter === 'unpriced' && !isUnpriced) return false;
      if (priceStatusFilter === 'out_of_stock' && !isOutOfStock) return false;

      // 3. Search query
      if (pricesSearchQuery.trim() !== '') {
        const q = pricesSearchQuery.toLowerCase().trim();
        const matchProdName = product?.name?.toLowerCase().includes(q);
        const matchProdId = product?.id?.toLowerCase().includes(q);
        const matchPkgId = pkg.id.toLowerCase().includes(q);
        const matchPkgName = pkg.displayName.toLowerCase().includes(q);
        const matchCompName = company?.name?.toLowerCase().includes(q);

        if (!matchProdName && !matchProdId && !matchPkgId && !matchPkgName && !matchCompName) {
          return false;
        }
      }

      return true;
    });
  }, [packages, products, companies, selectedCompanyId, priceStatusFilter, pricesSearchQuery, editingPriceMap]);

  // Filtered Price History for History Tab
  const filteredHistory = useMemo(() => {
    return priceHistory.filter((entry) => {
      const product = products.find((p) => p.id === entry.productId);
      const company = companies.find((c) => c.id === product?.companyId);

      if (selectedHistoryCompanyId !== 'ALL' && product?.companyId !== selectedHistoryCompanyId) {
        return false;
      }

      if (selectedHistorySource !== 'ALL' && entry.source !== selectedHistorySource) {
        return false;
      }

      if (historySearchQuery.trim() !== '') {
        const q = historySearchQuery.toLowerCase().trim();
        const matchProd = entry.productName?.toLowerCase().includes(q);
        const matchPkg = entry.packageDisplayName?.toLowerCase().includes(q);
        const matchUser = entry.updatedBy?.toLowerCase().includes(q);
        const matchComp = company?.name.toLowerCase().includes(q);
        const matchProdId = entry.productId?.toLowerCase().includes(q);
        const matchPkgId = entry.packageId?.toLowerCase().includes(q);

        if (!matchProd && !matchPkg && !matchUser && !matchComp && !matchProdId && !matchPkgId) {
          return false;
        }
      }

      return true;
    });
  }, [priceHistory, products, companies, selectedHistoryCompanyId, selectedHistorySource, historySearchQuery]);

  const hasActivePriceFilters =
    pricesSearchQuery.trim() !== '' || selectedCompanyId !== 'ALL' || priceStatusFilter !== 'ALL';

  const hasActiveHistoryFilters =
    historySearchQuery.trim() !== '' || selectedHistoryCompanyId !== 'ALL' || selectedHistorySource !== 'ALL';

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#046A47]" />
            <span>إدارة الأسعار وسجل التعديلات الكامل</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium mt-0.5">
            تعديل أسعار العبوات يدوياً ومتابعة وتصفية سجل حركة التغييرات السابقة مع الفرز الفوري بالشركات
          </p>
        </div>

        {/* Action Controls & Tab Selector */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsSmartPriceModalOpen(true)}
            className="px-4 py-2.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-2xl text-xs font-black shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="تحديث الأسعار ذكياً عبر لصق نص مباشر أو رفع ملف إكسيل / صورة / PDF"
          >
            <Zap className="w-4 h-4 text-emerald-300" />
            <span>تحديث ذكي للأسعار (نص / ملف)</span>
          </button>

          {/* Tab Selector */}
          <div className="flex bg-[#E5E2D9] p-1 rounded-2xl border border-[#D4D1C5]">
            <button
              onClick={() => setActiveTab('prices')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'prices'
                  ? 'bg-[#046A47] text-white shadow-xs'
                  : 'text-[#2D2D24] hover:text-[#046A47]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>جدول الأسعار الحالي ({packages.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#046A47] text-white shadow-xs'
                  : 'text-[#2D2D24] hover:text-[#046A47]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سجل التعديلات ({priceHistory.length})</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'prices' ? (
        <div className="space-y-4">
          {/* Prices Search & Filters Control Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* 1. Search Box (5 cols) */}
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-[#8A8A6D] absolute right-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، كود الصنف، كود العبوة، أو الشركة..."
                  value={pricesSearchQuery}
                  onChange={(e) => setPricesSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-8 py-2 bg-[#FAF8F5] border border-[#D4D1C5] focus:border-[#046A47] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none focus:ring-2 focus:ring-[#046A47]/20"
                />
                {pricesSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPricesSearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 2. Company Filter Dropdown (4 cols) */}
              <div className="md:col-span-4 relative flex items-center">
                <Building2 className="w-4 h-4 text-[#046A47] absolute right-3 pointer-events-none" />
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-[#FAF8F5] border border-[#D4D1C5] focus:border-[#046A47] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none focus:ring-2 focus:ring-[#046A47]/20 cursor-pointer"
                >
                  <option value="ALL">جميع الشركات المصنعة ({packages.length} عبوة)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({companyPackageCounts[c.id] || 0} عبوة)
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Status Filter (3 cols) */}
              <div className="md:col-span-3 relative flex items-center">
                <Filter className="w-4 h-4 text-[#046A47] absolute right-3 pointer-events-none" />
                <select
                  value={priceStatusFilter}
                  onChange={(e) => setPriceStatusFilter(e.target.value as any)}
                  className="w-full pr-9 pl-3 py-2 bg-[#FAF8F5] border border-[#D4D1C5] focus:border-[#046A47] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none focus:ring-2 focus:ring-[#046A47]/20 cursor-pointer"
                >
                  <option value="ALL">جميع الأسعار والحالات</option>
                  <option value="edited">تعديلات قيد الحفظ ({editedCount})</option>
                  <option value="below_cost">أقل من التكلفة ({belowCostCount})</option>
                  <option value="unpriced">أسعار غير محددة (0 ج)</option>
                  <option value="out_of_stock">أصناف نافذة من المخزون</option>
                </select>
              </div>
            </div>

            {/* Filter Status Pills & Batch Save Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#5A5A40]">
                  عرض: <strong className="text-[#046A47]">{filteredPackages.length}</strong> من أصل{' '}
                  <strong>{packages.length}</strong> عبوة
                </span>

                {selectedCompanyId !== 'ALL' && (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1">
                    <span>الشركة: {companies.find((c) => c.id === selectedCompanyId)?.name}</span>
                    <button onClick={() => setSelectedCompanyId('ALL')} className="hover:text-red-700 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {pricesSearchQuery && (
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1">
                    <span>بحث: "{pricesSearchQuery}"</span>
                    <button onClick={() => setPricesSearchQuery('')} className="hover:text-red-700 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {priceStatusFilter !== 'ALL' && (
                  <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1">
                    <span>
                      الحالة:{' '}
                      {priceStatusFilter === 'edited'
                        ? 'معدلة'
                        : priceStatusFilter === 'below_cost'
                        ? 'أقل من التكلفة'
                        : priceStatusFilter === 'unpriced'
                        ? 'غير مسعرة'
                        : 'نافذة'}
                    </span>
                    <button onClick={() => setPriceStatusFilter('ALL')} className="hover:text-red-700 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {hasActivePriceFilters && (
                  <button
                    onClick={() => {
                      setSelectedCompanyId('ALL');
                      setPricesSearchQuery('');
                      setPriceStatusFilter('ALL');
                    }}
                    className="text-gray-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer mr-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة ضبط الفلاتر</span>
                  </button>
                )}
              </div>

              {/* Batch Save Button */}
              {editedCount > 0 && (
                <button
                  onClick={handleSaveAllEditedPrices}
                  className="px-4 py-1.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>حفظ جميع التعديلات دفعة واحدة ({editedCount} عبوة)</span>
                </button>
              )}
            </div>
          </div>

          {/* Pricing Table */}
          <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-[#046A47] text-white text-xs font-bold">
                  <tr>
                    <th className="p-4">كود العبوة</th>
                    <th className="p-4">المنتج</th>
                    <th className="p-4">الشركة</th>
                    <th className="p-4">الحجم والوحدة</th>
                    <th className="p-4">المخزون</th>
                    <th className="p-4">سعر التكلفة</th>
                    <th className="p-4">سعر البيع الحالي</th>
                    <th className="p-4">تعديل السعر الجديد</th>
                    <th className="p-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D9]">
                  {filteredPackages.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-xs text-[#8A8A6D] font-bold">
                        <PackageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p>لا توجد عبوات أو منتجات تطابق البحث أو فلتر الشركة المحدد.</p>
                        {hasActivePriceFilters && (
                          <button
                            onClick={() => {
                              setSelectedCompanyId('ALL');
                              setPricesSearchQuery('');
                              setPriceStatusFilter('ALL');
                            }}
                            className="mt-3 px-4 py-1.5 bg-[#046A47] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>إعادة تعيين الفلاتر</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredPackages.map((pkg) => {
                      const product = products.find((p) => p.id === pkg.productId);
                      const company = companies.find((c) => c.id === product?.companyId);
                      const isEdited = editingPriceMap[pkg.id] !== undefined && editingPriceMap[pkg.id] !== pkg.price;
                      const currentVal = editingPriceMap[pkg.id] !== undefined ? editingPriceMap[pkg.id] : pkg.price;
                      const costVal = pkg.costPrice || 0;
                      const isBelowCost = costVal > 0 && currentVal < costVal;
                      const isOutOfStock = Boolean(
                        pkg.isOutOfStock ||
                        product?.isOutOfStock ||
                        (typeof product?.stockQuantity === 'number' && product.stockQuantity <= 0)
                      );

                      return (
                        <tr key={pkg.id} className="hover:bg-[#F1EFEC]/80 transition-colors">
                          <td className="p-4 font-mono text-xs font-bold text-[#8A8A6D]">{pkg.id}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {product?.mainImageUrl && (
                                <img
                                  src={product.mainImageUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-lg object-contain bg-white border border-gray-200 p-0.5 shrink-0"
                                />
                              )}
                              <div>
                                <span className="font-black text-[#2D2D24] block">{product?.name || pkg.productId}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{product?.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-bold text-[#046A47]">{company?.name || '-'}</td>
                          <td className="p-4 text-xs font-bold text-[#5A5A40]">{pkg.displayName}</td>
                          <td className="p-4">
                            {isOutOfStock ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2 py-0.5 rounded-md inline-block">
                                نفذ من المخزون ✕
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-md inline-block">
                                متوفر بالمخزون ✓
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-bold text-gray-600">
                            {costVal > 0 ? `${costVal} جنيه` : 'غير محدد'}
                          </td>
                          <td className="p-4 font-bold text-[#046A47] text-base">{pkg.price} جنيه</td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <input
                                type="number"
                                value={currentVal}
                                onChange={(e) => handlePriceChange(pkg.id, parseFloat(e.target.value) || 0)}
                                className={`w-32 p-2 border rounded-xl text-xs font-black transition-all ${
                                  isBelowCost
                                    ? 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-300'
                                    : isEdited
                                    ? 'border-amber-600 bg-amber-50 text-amber-900'
                                    : 'bg-[#F1EFEC] border-[#D4D1C5]'
                                }`}
                              />
                              {isBelowCost && (
                                <span className="block text-[10px] font-bold text-red-700">
                                  ⚠️ أقل من التكلفة ({costVal} ج)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleSavePrice(pkg)}
                              disabled={!isEdited}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 mx-auto cursor-pointer transition-all ${
                                isBelowCost
                                  ? 'bg-red-700 hover:bg-red-800 text-white'
                                  : 'bg-[#046A47] hover:bg-[#035237] disabled:opacity-30 text-white'
                              }`}
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>حفظ السعر</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] shadow-xs p-6 space-y-6">
          {/* History Search & Filters Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E2D9] shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#8A8A6D] absolute right-3.5 top-3" />
                <input
                  type="text"
                  placeholder="ابحث باسم المنتج، العبوة، الشركة، أو القائم بالتعديل..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pr-10 pl-8 py-2 bg-[#F1EFEC] border border-[#D4D1C5] focus:border-[#046A47] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none focus:ring-2 focus:ring-[#046A47]/20"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                    title="مسح البحث"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Company Dropdown Filter */}
              <div className="relative flex items-center">
                <Building2 className="w-4 h-4 text-[#046A47] absolute right-3 pointer-events-none" />
                <select
                  value={selectedHistoryCompanyId}
                  onChange={(e) => setSelectedHistoryCompanyId(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-[#F1EFEC] border border-[#D4D1C5] focus:border-[#046A47] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none focus:ring-2 focus:ring-[#046A47]/20 cursor-pointer"
                >
                  <option value="ALL">جميع الشركات المصنعة ({priceHistory.length} حركة)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({companyHistoryCounts[c.id] || 0} حركة)
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Dropdown Filter */}
              <div className="relative flex items-center">
                <Filter className="w-4 h-4 text-[#046A47] absolute right-3 pointer-events-none" />
                <select
                  value={selectedHistorySource}
                  onChange={(e) => setSelectedHistorySource(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 bg-[#F1EFEC] border border-[#D4D1C5] focus:border-[#046A47] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none focus:ring-2 focus:ring-[#046A47]/20 cursor-pointer"
                >
                  <option value="ALL">جميع المصادر (تعديل يدوي + استيراد)</option>
                  <option value="manual">تعديل يدوي فقط</option>
                  <option value="excel">استيراد ملف إكسيل فقط</option>
                </select>
              </div>
            </div>

            {/* Filter Status Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#5A5A40]">
                  عرض: <strong className="text-[#046A47]">{filteredHistory.length}</strong> من أصل{' '}
                  <strong>{priceHistory.length}</strong> حركة تعديل مسجلة
                </span>

                {selectedHistoryCompanyId !== 'ALL' && (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1">
                    <span>الشركة: {companies.find((c) => c.id === selectedHistoryCompanyId)?.name}</span>
                    <button
                      onClick={() => setSelectedHistoryCompanyId('ALL')}
                      className="hover:text-red-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {hasActiveHistoryFilters && (
                  <button
                    onClick={() => {
                      setSelectedHistoryCompanyId('ALL');
                      setHistorySearchQuery('');
                      setSelectedHistorySource('ALL');
                    }}
                    className="text-gray-500 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer mr-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة ضبط الفلاتر</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-[#5A5A40]">
            <h3 className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#046A47]" />
              <span>نتائج حركة التعديلات المفلترة:</span>
            </h3>
            <span>إجمالي السجلات المعروضة: {filteredHistory.length}</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-8 bg-white border border-[#E5E2D9] rounded-2xl text-center text-xs text-[#8A8A6D] font-bold space-y-2">
              <p>لا توجد حركة تعديلات أسعار تطابق التصفية الحالية.</p>
              {hasActiveHistoryFilters && (
                <button
                  onClick={() => {
                    setSelectedHistoryCompanyId('ALL');
                    setHistorySearchQuery('');
                    setSelectedHistorySource('ALL');
                  }}
                  className="px-3.5 py-1.5 bg-[#046A47] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة تعيين الفلاتر</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((entry) => {
                const product = products.find((p) => p.id === entry.productId);
                const company = companies.find((c) => c.id === product?.companyId);

                return (
                  <div
                    key={entry.id}
                    className="p-4 bg-white border border-[#D4D1C5] hover:border-[#046A47] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-[#2D2D24] text-sm">{entry.productName}</span>
                        {company && (
                          <span className="bg-[#046A47]/10 text-[#046A47] px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {company.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[#8A8A6D] font-medium block">
                        العبوة: <strong className="text-[#2D2D24]">{entry.packageDisplayName}</strong> | كود العبوة:{' '}
                        <code className="bg-[#F1EFEC] px-1 rounded">{entry.packageId}</code> | تم التعديل بواسطة:{' '}
                        {entry.updatedBy || 'المدير'}
                      </span>
                      {entry.createdAt && (
                        <span className="text-[10px] text-[#8A8A6D] block mt-0.5 font-mono">
                          التاريخ:{' '}
                          {isNaN(new Date(entry.createdAt).getTime())
                            ? entry.createdAt
                            : new Date(entry.createdAt).toLocaleString('ar-EG')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-left font-bold">
                        <span className="line-through text-red-600 block text-[11px]">{entry.oldPrice} جنيه</span>
                        <span className="text-[#046A47] font-black text-base">{entry.newPrice} جنيه</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          entry.source === 'excel'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : entry.source === 'smart_batch'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {entry.source === 'excel'
                          ? 'استيراد إكسيل'
                          : entry.source === 'smart_batch'
                          ? '⚡ تحديث ذكي'
                          : 'تعديل يدوي'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Smart Price Update Modal */}
      <SmartPriceUpdateModal
        isOpen={isSmartPriceModalOpen}
        onClose={() => setIsSmartPriceModalOpen(false)}
        products={products}
        packages={packages}
        companies={companies}
        onApplyPriceUpdates={handleApplySmartPriceUpdates}
        onShowToast={onShowToast}
      />
    </div>
  );
};
