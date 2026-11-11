import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Percent, Sprout, CheckCircle2, Layers } from 'lucide-react';
import { CatalogSettings, HomeShowcaseKey, Product } from '../../types';
import { resolveHomeShowcases } from '../../utils/homeShowcases';

interface HomeShowcaseBoxesProps {
  settings: CatalogSettings;
  products: Product[];
  selectedShowcaseKey: HomeShowcaseKey | null;
  onSelectShowcase: (key: HomeShowcaseKey | null) => void;
}

const TILE_THEMES: Record<
  HomeShowcaseKey,
  {
    gradient: string;
    border: string;
    activeBorder: string;
    activeFooter: string;
    badgeBg: string;
    icon: React.ReactNode;
  }
> = {
  latest: {
    gradient: 'from-emerald-100 via-teal-50 to-emerald-50',
    border: 'border-stone-200/85 hover:border-emerald-400',
    activeBorder: 'border-[#046A47] ring-4 ring-emerald-500/20 shadow-md',
    activeFooter: 'bg-[#046A47] text-white',
    badgeBg: 'bg-[#046A47] text-white',
    icon: <Sparkles className="w-7 h-7 sm:w-9 sm:h-9 text-[#046A47]" />,
  },
  merchant_deals: {
    gradient: 'from-amber-100 via-orange-50 to-rose-50',
    border: 'border-stone-200/85 hover:border-rose-400',
    activeBorder: 'border-rose-600 ring-4 ring-rose-500/20 shadow-md',
    activeFooter: 'bg-rose-600 text-white',
    badgeBg: 'bg-rose-600 text-white',
    icon: <Percent className="w-7 h-7 sm:w-9 sm:h-9 text-rose-600" />,
  },
  seasonal: {
    gradient: 'from-sky-100 via-cyan-50 to-emerald-50',
    border: 'border-stone-200/85 hover:border-sky-400',
    activeBorder: 'border-sky-700 ring-4 ring-sky-500/20 shadow-md',
    activeFooter: 'bg-sky-700 text-white',
    badgeBg: 'bg-sky-700 text-white',
    icon: <Sprout className="w-7 h-7 sm:w-9 sm:h-9 text-sky-700" />,
  },
};

export const HomeShowcaseBoxes: React.FC<HomeShowcaseBoxesProps> = ({
  settings,
  products,
  selectedShowcaseKey,
  onSelectShowcase,
}) => {
  const resolvedSections = resolveHomeShowcases(settings, products).filter((s) => s.enabled);

  if (resolvedSections.length === 0) return null;

  return (
    <section className="bg-white rounded-3xl p-3 sm:p-5 border border-stone-200/80 shadow-2xs space-y-2.5 sm:space-y-3 dir-rtl">
      {/* Compact Board Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-black text-stone-800 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#046A47]" />
          <span>أقسام العروض والمختارات</span>
        </span>
        {selectedShowcaseKey && (
          <button
            type="button"
            onClick={() => onSelectShowcase(null)}
            className="text-[11px] font-black text-rose-600 hover:underline cursor-pointer"
          >
            عرض كل المنتجات
          </button>
        )}
      </div>

      {/* Standalone Board: 3 Category-Style Square Cards Side-by-Side */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {resolvedSections.map((section) => {
          const theme = TILE_THEMES[section.key];
          const isSelected = selectedShowcaseKey === section.key;

          const activeItems = section.items.filter((it) =>
            products.some((p) => p.id === it.productId && p.active)
          );
          const maxDiscount = activeItems.reduce(
            (max, it) => Math.max(max, Number(it.discountPercent) || 0),
            0
          );
          const cornerBadge =
            maxDiscount > 0 ? `خصم حتى ${maxDiscount}%` : section.badgeText || '';

          return (
            <motion.button
              key={section.key}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                onSelectShowcase(isSelected ? null : section.key);
                if (!isSelected) {
                  setTimeout(() => {
                    const el = document.getElementById('catalog-products-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 60);
                }
              }}
              className={`group relative aspect-square sm:aspect-[16/10] md:h-36 rounded-2xl overflow-hidden cursor-pointer transition-all border-2 flex flex-col items-center justify-between bg-gradient-to-br ${theme.gradient} ${
                isSelected ? theme.activeBorder : `${theme.border} shadow-2xs hover:shadow-md`
              }`}
            >
              {/* Optional Top Corner Badge (Discount / Tag) */}
              {cornerBadge && (
                <span
                  className={`absolute top-1.5 right-1.5 z-10 text-[8.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs max-w-[82%] truncate ${theme.badgeBg}`}
                >
                  {cornerBadge}
                </span>
              )}

              {/* Selected Checkmark */}
              {isSelected && (
                <div className="absolute top-1.5 left-1.5 z-10 bg-[#046A47] text-white rounded-full p-0.5 shadow-md border-2 border-white">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}

              {/* Center Icon Area */}
              <div className="flex-1 w-full flex flex-col items-center justify-center pt-4 sm:pt-3 group-hover:scale-110 transition-transform">
                {theme.icon}
                <span className="text-[9px] sm:text-[10.5px] font-bold text-stone-500 mt-1">
                  {activeItems.length} صنف
                </span>
              </div>

              {/* Clean Category-Style Footer Title */}
              <div
                className={`w-full px-1 py-1.5 sm:py-2 text-center transition-colors border-t border-stone-200/50 ${
                  isSelected
                    ? theme.activeFooter
                    : 'bg-white/90 backdrop-blur-xs text-stone-900'
                }`}
              >
                <span className="text-[11px] sm:text-sm font-black line-clamp-1 block">
                  {section.title}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
