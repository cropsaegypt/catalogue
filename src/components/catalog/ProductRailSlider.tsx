import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { Product, Package, Company } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductRailSliderProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  products: Product[];
  packages: Package[];
  companies: Company[];
  onOpenDetails: (product: Product, selectedPackage?: Package) => void;
  onQuickAdd: (product: Product, packageObj: Package, quantity: number, unit?: 'piece' | 'carton') => void;
  onRequestAdd?: (product: Product, selectedPackage?: Package) => void;
  showProductIds?: boolean;
  showPrices?: boolean;
  whatsAppNumber?: string;
  onViewAll?: () => void;
}

export const ProductRailSlider: React.FC<ProductRailSliderProps> = ({
  title,
  subtitle,
  badgeText,
  products,
  packages,
  companies,
  onOpenDetails,
  onQuickAdd,
  onRequestAdd,
  showProductIds = true,
  showPrices = true,
  whatsAppNumber,
  onViewAll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scrollByAmount = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = dir === 'left' ? -300 : 300;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className="space-y-3 dir-rtl bg-gradient-to-b from-amber-50/50 to-transparent p-3 sm:p-4 rounded-3xl border border-amber-200/50">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center shadow-xs shrink-0">
            <Flame className="w-5 h-5 fill-stone-950/15" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-stone-900">
                {title}
              </h2>
              {badgeText && (
                <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-black text-[#046A47] hover:underline px-2 py-1 cursor-pointer"
            >
              عرض الكل
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByAmount('right')}
              className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount('left')}
              className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Products Slider */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none"
      >
        {products.map((product) => {
          const company = companies.find((c) => c.id === product.companyId);
          const prodPackages = packages.filter((p) => p.productId === product.id && p.active);

          return (
            <div key={product.id} className="w-[185px] sm:w-[235px] shrink-0 flex flex-col">
              <ProductCard
                product={product}
                company={company}
                packages={prodPackages}
                onOpenDetails={onOpenDetails}
                onQuickAdd={onQuickAdd}
                onRequestAdd={onRequestAdd}
                showProductId={showProductIds}
                showPrices={showPrices}
                whatsAppNumber={whatsAppNumber}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};
