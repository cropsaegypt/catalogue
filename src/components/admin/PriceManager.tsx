import React, { useState } from 'react';
import { DollarSign, History, Save, Search, Filter, Building2 } from 'lucide-react';
import { Product, Package, PriceHistory, Company } from '../../types';

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

  // History Filter States
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedHistoryCompanyId, setSelectedHistoryCompanyId] = useState('ALL');
  const [selectedHistorySource, setSelectedHistorySource] = useState('ALL');

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

    // clear edit map entry
    const newMap = { ...editingPriceMap };
    delete newMap[pkg.id];
    setEditingPriceMap(newMap);

    if (costPrice > 0 && newPrice < costPrice) {
      onShowToast(`تم تحديث السعر مع تنبيه: السعر (${newPrice} ج) أقل من التكلفة (${costPrice} ج)`, 'error');
    } else {
      onShowToast(`تم تحديث سعر العبوة ${pkg.displayName} من ${oldPrice} إلى ${newPrice} جنيه`, 'success');
    }
  };

  // Filtered Price History
  const filteredHistory = priceHistory.filter((entry) => {
    const product = products.find((p) => p.id === entry.productId);
    const company = companies.find((c) => c.id === product?.companyId);

    if (selectedHistoryCompanyId !== 'ALL' && product?.companyId !== selectedHistoryCompanyId) {
      return false;
    }

    if (selectedHistorySource !== 'ALL' && entry.source !== selectedHistorySource) {
      return false;
    }

    if (historySearchQuery.trim() !== '') {
      const q = historySearchQuery.toLowerCase();
      const matchProd = entry.productName?.toLowerCase().includes(q);
      const matchPkg = entry.packageDisplayName?.toLowerCase().includes(q);
      const matchUser = entry.updatedBy?.toLowerCase().includes(q);
      const matchComp = company?.name.toLowerCase().includes(q);
      if (!matchProd && !matchPkg && !matchUser && !matchComp) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#046A47]" />
            <span>إدارة الأسعار وسجل التعديلات الكامل</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium">تعديل أسعار العبوات يدوياً ومتابعة وتصفية سجل حركة التغييرات السابقة</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#E5E2D9] p-1 rounded-2xl border border-[#D4D1C5] shrink-0">
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'prices' ? 'bg-[#046A47] text-white shadow-xs' : 'text-[#2D2D24]'
            }`}
          >
            جدول الأسعار الحالي
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-[#046A47] text-white shadow-xs' : 'text-[#2D2D24]'
            }`}
          >
            سجل التعديلات ({priceHistory.length})
          </button>
        </div>
      </div>

      {activeTab === 'prices' ? (
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] shadow-xs overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#046A47] text-white text-xs font-bold">
              <tr>
                <th className="p-4">كود العبوة</th>
                <th className="p-4">المنتج</th>
                <th className="p-4">الشركة</th>
                <th className="p-4">الحجم والوحدة</th>
                <th className="p-4">سعر التكلفة</th>
                <th className="p-4">سعر البيع الحالي</th>
                <th className="p-4">تعديل السعر</th>
                <th className="p-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2D9]">
              {packages.map((pkg) => {
                const product = products.find((p) => p.id === pkg.productId);
                const company = companies.find((c) => c.id === product?.companyId);
                const isEdited = editingPriceMap[pkg.id] !== undefined && editingPriceMap[pkg.id] !== pkg.price;
                const currentVal = editingPriceMap[pkg.id] !== undefined ? editingPriceMap[pkg.id] : pkg.price;
                const costVal = pkg.costPrice || 0;
                const isBelowCost = costVal > 0 && currentVal < costVal;

                return (
                  <tr key={pkg.id} className="hover:bg-[#F1EFEC]/80 transition-colors">
                    <td className="p-4 font-mono text-xs font-bold text-[#8A8A6D]">{pkg.id}</td>
                    <td className="p-4 font-black text-[#2D2D24]">{product?.name || pkg.productId}</td>
                    <td className="p-4 text-xs font-bold text-[#046A47]">{company?.name || '-'}</td>
                    <td className="p-4 text-xs font-bold text-[#5A5A40]">{pkg.displayName}</td>
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
                          className={`w-32 p-2 border rounded-xl text-xs font-black ${
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
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] shadow-xs p-6 space-y-6">
          {/* History Search & Filters Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E2D9] grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8A8A6D] absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث باسم المنتج، العبوة، أو المستخدم..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#046A47]"
              />
            </div>

            {/* Company Dropdown Filter */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#046A47] shrink-0" />
              <select
                value={selectedHistoryCompanyId}
                onChange={(e) => setSelectedHistoryCompanyId(e.target.value)}
                className="w-full p-2 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none"
              >
                <option value="ALL">جميع الشركات المصنعة</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Dropdown Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#046A47] shrink-0" />
              <select
                value={selectedHistorySource}
                onChange={(e) => setSelectedHistorySource(e.target.value)}
                className="w-full p-2 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs font-bold text-[#2D2D24] focus:outline-none"
              >
                <option value="ALL">جميع المصادر (تعديل يدوي + استيراد)</option>
                <option value="manual">تعديل يدوي فقط</option>
                <option value="excel">استيراد ملف إكسيل فقط</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-[#5A5A40]">
            <h3 className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#046A47]" />
              <span>نتائج حركة التعديلات المفلترة:</span>
            </h3>
            <span>إجمالي السجلات: {filteredHistory.length}</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-8 bg-white border border-[#E5E2D9] rounded-2xl text-center text-xs text-[#8A8A6D] font-bold">
              لا توجد حركة تعديلات أسعار تطابق التصفية الحالية.
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
                          التاريخ: {isNaN(new Date(entry.createdAt).getTime()) ? entry.createdAt : new Date(entry.createdAt).toLocaleString('ar-EG')}
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
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {entry.source === 'excel' ? 'استيراد إكسيل' : 'تعديل يدوي'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

