import React, { useState } from 'react';
import {
  Sparkles,
  Tag,
  Sprout,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
  Percent,
} from 'lucide-react';
import {
  CatalogSettings,
  Company,
  HomeShowcaseItem,
  HomeShowcaseKey,
  HomeShowcaseSection,
  Package,
  Product,
} from '../../types';
import { FALLBACK_BOTTLE_SVG_DATA_URL } from '../../utils/agriculturalImages';
import { computeShowcasePricing, resolveHomeShowcases } from '../../utils/homeShowcases';

interface HomeShowcaseBoxesProps {
  settings: CatalogSettings;
  products: Product[];
  packages: Package[];
  companies: Company[];
  onOpenDetails: (product: Product, selectedPackage?: Package) => void;
  onRequestAdd: (
    product: Product,
    selectedPackage?: Package,
    promoDiscountPercent?: number,
    promoLabel?: string
  ) => void;
}

const SECTION_THEMES: Record<
  HomeShowcaseKey,
  {
    wrapper: string;
    headerBg: string;
    iconBg: string;
    badge: string;
    accentText: string;
    icon: React.ReactNode;
  }
> = {
  latest: {
    wrapper: 'bg-white border-emerald-200/90 hover:border-emerald-400',
    headerBg: 'bg-gradient-to-l from-emerald-50 via-teal-50/70 to-white border-b border-emerald-100',
    iconBg: 'bg-[#046A47] text-white',
    badge: 'bg-emerald-600 text-white',
    accentText: 'text-[#046A47]',
    icon: <Sparkles className="w-4 h-4" />,
  },
  merchant_deals: {
    wrapper: 'bg-white border-amber-200/90 hover:border-amber-400',
    headerBg: 'bg-gradient-to-l from-amber-50 via-orange-50/70 to-white border-b border-amber-100',
    iconBg: 'bg-gradient-to-br from-rose-600 to-amber-600 text-white',
    badge: 'bg-rose-600 text-white',
    accentText: 'text-rose-700',
    icon: <Percent className="w-4 h-4" />,
  },
  seasonal: {
    wrapper: 'bg-white border-sky-200/90 hover:border-sky-400',
    headerBg: 'bg-gradient-to-l from-sky-50 via-cyan-50/70 to-white border-b border-sky-100',
    iconBg: 'bg-sky-700 text-white',
    badge: 'bg-sky-700 text-white',
    accentText: 'text-sky-800',
    icon: <Sprout className="w-4 h-4" />,
  },
};

export const HomeShowcaseBoxes: React.FC<HomeShowcaseBoxesProps> = ({
  settings,
  products,
  packages,
  companies,
  onOpenDetails,
  onRequestAdd,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const resolvedSections = resolveHomeShowcases(settings, products).filter(
    (section) => section.enabled
  );

  if (resolvedSections.length === 0) return null;

  const visibleWithData = resolvedSections.filter((sec) =>
    sec.items.some((it) => products.some((p) => p.id === it.productId && p.active))
  );
  if (visibleWithData.length === 0) return null;

  return (
    <section className="dir-rtl space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
        {resolvedSections.map((section: HomeShowcaseSection) => {
          if (!section.enabled) return null;
          const theme = SECTION_THEMES[section.key];
          const resolvedItems = section.items
            .map((item) => {
              const product = products.find((p) => p.id === item.productId && p.active);
              if (!product) return null;
              const company = companies.find((c) => c.id === product.companyId);
              const prodPkgs = packages
                .filter((pkg) => pkg.productId === product.id && pkg.active)
                .sort((a, b) => a.displayOrder - b.displayOrder);
              const primaryPkg = prodPkgs[0];
              return { item, product, company, primaryPkg };
            })
            .filter(Boolean) as Array<{
            item: HomeShowcaseItem;
            product: Product;
            company?: Company;
            primaryPkg?: Package;
          }>;

          const isExpanded = Boolean(expandedSections[section.key]);
          const shownItems = isExpanded ? resolvedItems : resolvedItems.slice(0, 4);
          const hasMore = resolvedItems.length > 4;

          return (
            <div
              key={section.key}
              className={`rounded-3xl border shadow-xs transition-all flex flex-col justify-between overflow-hidden ${theme.wrapper}`}
            >
              {/* Box Header */}
              <div className={`px-4 py-3.5 flex items-start justify-between gap-2 ${theme.headerBg}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${theme.iconBg}`}
                  >
                    {theme.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-stone-900 truncate">
                        {section.title}
                      </h3>
                      {section.badgeText && (
                        <span
                          className={`text-[9.5px] font-black px-2 py-0.5 rounded-full shrink-0 ${theme.badge}`}
                        >
                          {section.badgeText}
                        </span>
                      )}
                    </div>
                    {section.subtitle && (
                      <p className="text-[11px] text-stone-500 font-semibold line-clamp-1 mt-0.5">
                        {section.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-black text-stone-500 bg-white/90 border border-stone-200 px-2 py-0.5 rounded-full shrink-0">
                  {resolvedItems.length} صنف
                </span>
              </div>

              {/* Products Grid inside Box */}
              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                {shownItems.length === 0 ? (
                  <div className="py-10 text-center text-xs font-bold text-stone-400">
                    لم يتم إضافة منتجات لهذا القسم بعد
                  </div>
                ) : (
                  <div
                    className={`grid gap-2.5 ${
                      shownItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                    }`}
                  >
                    {shownItems.map(({ item, product, company, primaryPkg }) => {
                      const rawImg = product.mainImageUrl || '';
                      const imgSrc =
                        !rawImg || rawImg.includes('photo-1592417817098-8f3d6ef23a81')
                          ? FALLBACK_BOTTLE_SVG_DATA_URL
                          : rawImg;
                      const isPackImage =
                        imgSrc.startsWith('/uploads/') ||
                        imgSrc.startsWith('data:image') ||
                        imgSrc.includes('firebasestorage');

                      const basePrice = primaryPkg?.price ?? 0;
                      const pricing = computeShowcasePricing(basePrice, item);

                      return (
                        <div
                          key={item.id}
                          onClick={() => onOpenDetails(product, primaryPkg)}
                          className="group/item bg-stone-50/70 hover:bg-white rounded-2xl border border-stone-200/80 hover:border-[#046A47] p-2 flex flex-col justify-between gap-1.5 cursor-pointer transition-all hover:shadow-sm"
                        >
                          {/* Image + Discount Ribbon */}
                          <div className="relative h-28 sm:h-32 w-full rounded-xl bg-white border border-stone-100 flex items-center justify-center overflow-hidden p-1.5">
                            {pricing.hasDiscount && pricing.badgeLabel && (
                              <span className="absolute top-1 right-1 z-10 inline-flex items-center gap-0.5 bg-rose-600 text-white text-[9.5px] font-black px-1.5 py-0.5 rounded-md shadow-2xs max-w-[90%] truncate">
                                <Tag className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{pricing.badgeLabel}</span>
                              </span>
                            )}

                            <img
                              src={imgSrc}
                              alt={product.name}
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_BOTTLE_SVG_DATA_URL;
                              }}
                              className={`w-full h-full group-hover/item:scale-105 transition-transform duration-200 ${
                                isPackImage ? 'object-contain' : 'object-cover rounded-lg'
                              }`}
                              loading="lazy"
                            />

                            {primaryPkg && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestAdd(
                                    product,
                                    primaryPkg,
                                    pricing.discountPercent > 0 ? pricing.discountPercent : undefined,
                                    pricing.badgeLabel || undefined
                                  );
                                }}
                                className="absolute bottom-1 left-1 z-10 w-7 h-7 rounded-full bg-white/95 hover:bg-[#046A47] text-stone-800 hover:text-white border border-stone-200 hover:border-[#046A47] shadow-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="أضف للطلبية"
                              >
                                <Plus className="w-3.5 h-3.5 font-black" />
                              </button>
                            )}
                          </div>

                          {/* Product Meta & Discounted Price */}
                          <div className="space-y-1">
                            <h4 className="text-[11.5px] sm:text-xs font-black text-stone-900 group-hover/item:text-[#046A47] line-clamp-2 leading-snug min-h-[2rem]">
                              {product.name}
                            </h4>

                            <div className="flex items-center justify-between gap-1 text-[9.5px] text-stone-500 font-bold">
                              <span className="inline-flex items-center gap-0.5 truncate">
                                <Building2 className="w-2.5 h-2.5 text-[#046A47] shrink-0" />
                                <span className="truncate">{company?.name || 'كروپسا'}</span>
                              </span>
                              {primaryPkg && (
                                <span className="bg-stone-200/70 text-stone-800 px-1.5 py-0.5 rounded font-black shrink-0">
                                  {primaryPkg.displayName}
                                </span>
                              )}
                            </div>

                            {item.note && (
                              <div className="text-[9.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded-md truncate">
                                {item.note}
                              </div>
                            )}

                            {/* Price Row */}
                            <div className="pt-1 border-t border-stone-200/70 flex items-baseline justify-between gap-1">
                              {settings.showPrices && primaryPkg ? (
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className={`text-xs sm:text-sm font-black ${theme.accentText}`}>
                                    {pricing.finalPrice.toLocaleString('en-US')} ج.م
                                  </span>
                                  {pricing.discountPercent > 0 && (
                                    <span className="text-[10px] text-stone-400 line-through font-bold">
                                      {pricing.originalPrice.toLocaleString('en-US')}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-stone-400">السعر عند الطلب</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Expand / Collapse Footer if > 4 products */}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        [section.key]: !prev[section.key],
                      }))
                    }
                    className="w-full py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-black text-stone-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>إظهار أقل</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>عرض كل المنتجات ({resolvedItems.length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
