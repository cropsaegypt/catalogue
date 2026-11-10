import React, { useState } from 'react';
import { X, Building2, Search, ShoppingBag, Eye, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Company, Product, Package } from '../../types';

interface CompanyDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  products: Product[];
  packages: Package[];
  onOpenProductDetails: (product: Product, packageObj?: Package) => void;
  onQuickAdd: (product: Product, packageObj: Package, quantity: number, unit: 'piece' | 'carton') => void;
  onSelectCompanyFilter: (companyId: string) => void;
}

export const CompanyDirectoryModal: React.FC<CompanyDirectoryModalProps> = ({
  isOpen,
  onClose,
  companies,
  products,
  packages,
  onOpenProductDetails,
  onQuickAdd,
  onSelectCompanyFilter,
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(
    companies.length > 0 ? companies[0].id : null
  );

  const activeCompanies = companies.filter((c) => c.active);

  const filteredCompanies = activeCompanies.filter((comp) => {
    const compProducts = products.filter((p) => p.companyId === comp.id && p.active);
    const matchesSearch =
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      compProducts.some((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

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
              <h2 className="text-lg sm:text-xl font-black leading-tight">دليل الشركات المصنعة والمنتجات</h2>
              <p className="text-xs text-emerald-100 font-medium">استعرض الشركات المعتمدة ومنتجات كل شركة بسهولة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-emerald-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الشركة أو منتج معين..."
              className="w-full pr-10 pl-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
            />
          </div>
        </div>

        {/* Main Directory Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-xs font-bold text-gray-500">
              لا توجد شركات مطابقة للبحث حالياً.
            </div>
          ) : (
            filteredCompanies.map((comp) => {
              const compProducts = products.filter((p) => p.companyId === comp.id && p.active);
              const isExpanded = expandedCompanyId === comp.id;

              return (
                <div
                  key={comp.id}
                  className="bg-white rounded-2xl border-2 border-emerald-800/15 overflow-hidden shadow-xs hover:border-[#046A47] transition-all"
                >
                  {/* Company Header Row */}
                  <div
                    onClick={() => setExpandedCompanyId(isExpanded ? null : comp.id)}
                    className="p-4 bg-[#F4F8F6] flex items-center justify-between cursor-pointer hover:bg-emerald-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-[#046A47] overflow-hidden bg-white shrink-0 p-0.5 shadow-xs flex items-center justify-center">
                        <img
                          src={comp.logoUrl || 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=150&auto=format&fit=crop&q=80'}
                          alt={comp.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-[#046A47] leading-tight">{comp.name}</h3>
                        <p className="text-xs text-gray-600 font-semibold mt-0.5">
                          {compProducts.length} منتج متوفر معتمد
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompanyFilter(comp.id);
                          onClose();
                        }}
                        className="hidden sm:inline-flex bg-[#046A47] hover:bg-[#035237] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs"
                      >
                        عرض في الكتالوج الرئيسي
                      </button>
                      <div className="p-1 bg-white rounded-full border border-emerald-200">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-[#046A47]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#046A47]" />
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
                            const prodPackages = packages.filter((p) => p.productId === product.id && p.active);
                            const firstPkg = prodPackages[0];

                            return (
                              <div
                                key={product.id}
                                className="p-3 bg-[#FAF8F5] rounded-xl border border-emerald-200 hover:border-[#046A47] flex flex-col justify-between transition-all"
                              >
                                <div>
                                  <div className="h-28 w-full bg-white rounded-lg p-2 mb-2 flex items-center justify-center border border-gray-200 overflow-hidden">
                                    <img
                                      src={product.mainImageUrl || 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=200&auto=format&fit=crop&q=80'}
                                      alt={product.name}
                                      className="max-h-full max-w-full object-contain"
                                    />
                                  </div>
                                  <h4 className="font-bold text-xs text-[#046A47] line-clamp-1 mb-1">{product.name}</h4>
                                  <p className="text-[11px] text-gray-600 line-clamp-2 mb-2">{product.shortDescription}</p>
                                </div>

                                <div className="pt-2 border-t border-emerald-100 flex items-center justify-between gap-1">
                                  {firstPkg ? (
                                    <span className="text-xs font-black text-[#D93B2B]">{firstPkg.price} ج</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-gray-500">حسب العبوة</span>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => onOpenProductDetails(product, firstPkg)}
                                      className="p-1.5 bg-white hover:bg-emerald-50 text-[#046A47] rounded-lg border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>تفاصيل</span>
                                    </button>

                                    {firstPkg && (
                                      <button
                                        onClick={() => onQuickAdd(product, firstPkg, 1, 'piece')}
                                        className="p-1.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
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
        <div className="p-4 bg-[#F4F8F6] border-t border-emerald-200 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600">
            إجمالي الشركات النشطة: {activeCompanies.length} شركة
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#046A47] text-white rounded-xl text-xs font-bold hover:bg-[#035237] transition-colors"
          >
            إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
};
