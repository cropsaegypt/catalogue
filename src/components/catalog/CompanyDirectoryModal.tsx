import React, { useState } from 'react';
import {
  X,
  Building2,
  Search,
  ShoppingBag,
  Eye,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Company, Product, Package } from '../../types';
import { CompanyAvailabilityItem } from '../../utils/categoryHierarchy';

interface CompanyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  companiesMeta?: CompanyAvailabilityItem[];
  products: Product[];
  packages: Package[];
  selectedCompanyIds: string[];
  onToggleCompany: (companyId: string) => void;
  onClearCompanies?: () => void;
  onOpenProductDetails: (product: Product, packageObj?: Package) => void;
  onQuickAdd: (product: Product, packageObj: Package, quantity: number, unit: 'piece' | 'carton') => void;
  hasCategoryRestrictionOnCompanies?: boolean;
  matchingProductsCount?: number;
}

export const CompanyDirectoryModal: React.FC<CompanyDirectoryModalProps> = ({
  isOpen,
  onClose,
  companies,
  companiesMeta,
  products,
  packages,
  selectedCompanyIds,
  onToggleCompany,
  onClearCompanies,
  onOpenProductDetails,
  onQuickAdd,
  hasCategoryRestrictionOnCompanies = false,
  matchingProductsCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCompanies = companies.filter((c) => c.active);
  const metaMap = new Map<string, CompanyAvailabilityItem>();
  if (companiesMeta) {
    for (const item of companiesMeta) {
      metaMap.set(item.company.id, item);
    }
  }

  const filteredCompanies = activeCompanies
    .filter((comp) => {
      const compProducts = products.filter((p) => p.companyId === comp.id && p.active);
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        comp.name.toLowerCase().includes(q) ||
        compProducts.some((p) => p.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      // Available / selected companies first when category filter is active
      const aSelected = selectedCompanyIds.includes(a.id) ? 1 : 0;
      const bSelected = selectedCompanyIds.includes(b.id) ? 1 : 0;
      if (aSelected !== bSelected) return bSelected - aSelected;
      const aAvail = metaMap.get(a.id)?.isAvailable !== false ? 1 : 0;
      const bAvail = metaMap.get(b.id)?.isAvailable !== false ? 1 : 0;
      return bAvail - aAvail;
    });

  const handleApplyAndView = () => {
    onClose();
    setTimeout(() => {
      const el = document.getElementById('catalog-products-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs dir-rtl animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-emerald-800/20 flex flex-col justify-between">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#046A47] to-[#035237] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
              <Building2 className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black leading-tight">
                دليل الشركات المصنعة ({activeCompanies.length})
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                ابحث وحدد شركة واحدة أو أكثر معاً ثم اعرض منتجاتها
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar + Selected Summary */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-emerald-100 shrink-0 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الشركة أو اسم المنتج..."
              className="w-full pr-10 pl-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
            />
          </div>

          {selectedCompanyIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-stone-500">الشركات المحددة:</span>
                {selectedCompanyIds.map((cId) => {
                  const comp = activeCompanies.find((c) => c.id === cId);
                  if (!comp) return null;
                  return (
                    <span
                      key={cId}
                      className="inline-flex items-center gap-1 bg-[#046A47] text-white font-black px-2.5 py-0.5 rounded-lg"
                    >
                      <span>{comp.name}</span>
                      <button
                        type="button"
                        onClick={() => onToggleCompany(cId)}
                        className="hover:text-amber-300 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {onClearCompanies && (
                <button
                  type="button"
                  onClick={onClearCompanies}
                  className="text-[11px] font-black text-rose-600 hover:underline cursor-pointer"
                >
                  إلغاء تحديد الشركات
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main Directory Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-xs font-bold text-gray-500">
              لا توجد شركات مطابقة للبحث حالياً.
            </div>
          ) : (
            filteredCompanies.map((comp) => {
              const compProducts = products.filter((p) => p.companyId === comp.id && p.active);
              const isExpanded = expandedCompanyId === comp.id;
              const isSelected = selectedCompanyIds.includes(comp.id);
              const availMeta = metaMap.get(comp.id);
              const isDimmed = hasCategoryRestrictionOnCompanies && availMeta && !availMeta.isAvailable;

              return (
                <div
                  key={comp.id}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                    isSelected
                      ? 'border-[#046A47] ring-2 ring-emerald-500/15 shadow-sm'
                      : isDimmed
                        ? 'border-stone-200 opacity-55'
                        : 'border-emerald-800/15 hover:border-[#046A47] shadow-2xs'
                  }`}
                >
                  {/* Company Header Row */}
                  <div
                    onClick={() => setExpandedCompanyId(isExpanded ? null : comp.id)}
                    className={`p-3.5 sm:p-4 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/70' : 'bg-[#F4F8F6] hover:bg-emerald-100/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl border border-stone-200 overflow-hidden bg-white shrink-0 p-1 shadow-2xs flex items-center justify-center">
                        {comp.logoUrl ? (
                          <img
                            src={comp.logoUrl}
                            alt={comp.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-[#046A47]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm sm:text-base text-[#046A47] leading-tight truncate">
                          {comp.name}
                        </h3>
                        <p className="text-[11px] text-gray-600 font-semibold mt-0.5">
                          {hasCategoryRestrictionOnCompanies && availMeta
                            ? availMeta.matchingCount > 0
                              ? `${availMeta.matchingCount} منتج في الأقسام المختارة (من إجمالي ${compProducts.length})`
                              : `لا تتوفر منتجات للأقسام المختارة (${compProducts.length} منتج آخر)`
                            : `${compProducts.length} منتج متوفر معتمد`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCompany(comp.id);
                        }}
                        className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#046A47] text-white shadow-xs'
                            : 'bg-white hover:bg-emerald-50 text-[#046A47] border border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'مختارة ✓' : 'اختيار'}</span>
                      </button>

                      <div className="p-1.5 bg-white rounded-full border border-emerald-200">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#046A47]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#046A47]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Products Grid */}
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-emerald-100 space-y-3">
                      {compProducts.length === 0 ? (
                        <p className="text-xs text-gray-500 font-bold text-center py-4">
                          لا توجد منتجات مسجلة لهذه الشركة حالياً.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {compProducts.map((product) => {
                            const prodPackages = packages.filter(
                              (p) => p.productId === product.id && p.active
                            );
                            const firstPkg = prodPackages[0];

                            return (
                              <div
                                key={product.id}
                                className="p-3 bg-[#FAF8F5] rounded-xl border border-emerald-200 hover:border-[#046A47] flex flex-col justify-between transition-all"
                              >
                                <div>
                                  <div className="h-28 w-full bg-white rounded-lg p-2 mb-2 flex items-center justify-center border border-gray-200 overflow-hidden">
                                    <img
                                      src={
                                        product.mainImageUrl ||
                                        'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=200&auto=format&fit=crop&q=80'
                                      }
                                      alt={product.name}
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  </div>
                                  <h4 className="font-bold text-xs text-[#046A47] line-clamp-1 mb-1">
                                    {product.name}
                                  </h4>
                                  <p className="text-[11px] text-gray-600 line-clamp-2 mb-2">
                                    {product.shortDescription}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-emerald-100 flex items-center justify-between gap-1">
                                  {firstPkg ? (
                                    <span className="text-xs font-black text-[#D93B2B]">
                                      {firstPkg.price} ج
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-gray-500">
                                      حسب العبوة
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => onOpenProductDetails(product, firstPkg)}
                                      className="p-1.5 bg-white hover:bg-emerald-50 text-[#046A47] rounded-lg border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>تفاصيل</span>
                                    </button>

                                    {firstPkg && (
                                      <button
                                        type="button"
                                        onClick={() => onQuickAdd(product, firstPkg, 1, 'piece')}
                                        className="p-1.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        <span>أضف</span>
                                      </button>
                                    )}
                                  </div>
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
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F4F8F6] border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-bold text-gray-600">
            {selectedCompanyIds.length > 0
              ? `تم تحديد ${selectedCompanyIds.length} شركة (${matchingProductsCount ?? '—'} منتج مطابق)`
              : `إجمالي الشركات النشطة: ${activeCompanies.length} شركة`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyAndView}
              className="px-5 py-2.5 bg-[#046A47] text-white rounded-xl text-xs font-black hover:bg-[#035237] transition-colors cursor-pointer shadow-xs"
            >
              {selectedCompanyIds.length > 0 ? 'عرض منتجات الشركات المختارة' : 'إغلاق الدليل'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
