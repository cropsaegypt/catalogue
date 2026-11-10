import React from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  Flame,
  Sprout,
  Droplets,
  ShieldAlert,
  Bug,
  Building2,
} from 'lucide-react';
import { Category } from '../../types';

interface NoonCategorySliderProps {
  categories: Category[];
  selectedCategoryId: string;
  selectedProductType: string;
  onSelectCategory: (catId: string) => void;
  onSelectProductType: (type: string) => void;
  onOpenCompanies?: () => void;
}

export const NoonCategorySlider: React.FC<NoonCategorySliderProps> = ({
  categories,
  selectedCategoryId,
  selectedProductType,
  onSelectCategory,
  onSelectProductType,
  onOpenCompanies,
}) => {
  const staticStories = [
    {
      id: 'ALL',
      title: 'الكل',
      subtitle: 'كل الأصناف',
      icon: <Layers className="w-6 h-6 sm:w-7 sm:h-7" />,
      bg: 'bg-emerald-50 text-emerald-700',
      activeBg: 'bg-[#046A47] text-white ring-4 ring-emerald-200',
      kind: 'all',
    },
    {
      id: 'featured',
      title: 'عروض اليوم',
      subtitle: 'تخفيضات حصرية',
      icon: <Flame className="w-6 h-6 sm:w-7 sm:h-7" />,
      bg: 'bg-amber-50 text-amber-600',
      activeBg: 'bg-amber-500 text-white ring-4 ring-amber-200',
      kind: 'type',
      value: 'featured',
    },
    {
      id: 'fertilizer',
      title: 'أسمدة بودرة',
      subtitle: 'شكاير وباودر',
      icon: <Sprout className="w-6 h-6 sm:w-7 sm:h-7" />,
      bg: 'bg-lime-50 text-lime-700',
      activeBg: 'bg-lime-600 text-white ring-4 ring-lime-200',
      kind: 'type',
      value: 'fertilizer',
    },
    {
      id: 'stimulant',
      title: 'مخصبات سائلة',
      subtitle: 'جذور وأحماض',
      icon: <Droplets className="w-6 h-6 sm:w-7 sm:h-7" />,
      bg: 'bg-sky-50 text-sky-600',
      activeBg: 'bg-sky-600 text-white ring-4 ring-sky-200',
      kind: 'type',
      value: 'stimulant',
    },
    {
      id: 'pesticide',
      title: 'مبيدات حشائش',
      subtitle: 'حماية شاملة',
      icon: <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />,
      bg: 'bg-rose-50 text-rose-600',
      activeBg: 'bg-rose-600 text-white ring-4 ring-rose-200',
      kind: 'type',
      value: 'pesticide',
    },
    {
      id: 'pesticide_insect',
      title: 'مكافحة الحشرات',
      subtitle: 'ديدان ومنّ',
      icon: <Bug className="w-6 h-6 sm:w-7 sm:h-7" />,
      bg: 'bg-purple-50 text-purple-600',
      activeBg: 'bg-purple-600 text-white ring-4 ring-purple-200',
      kind: 'type',
      value: 'pesticide_insect',
    },
  ];

  return (
    <section className="w-full dir-rtl py-1">
      <div className="flex items-start gap-3 sm:gap-5 overflow-x-auto pb-2 px-1 scrollbar-none">
        {staticStories.map((item) => {
          const isActive =
            item.kind === 'all'
              ? selectedCategoryId === 'ALL' && selectedProductType === 'ALL'
              : selectedProductType === item.value;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (item.kind === 'all') {
                  onSelectCategory('ALL');
                  onSelectProductType('ALL');
                } else if (item.value) {
                  onSelectCategory('ALL');
                  onSelectProductType(isActive ? 'ALL' : item.value);
                }
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-[72px] sm:w-[88px]"
            >
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-xs border border-stone-200/60 ${
                  isActive ? item.activeBg : `${item.bg} group-hover:shadow-md`
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[11px] sm:text-xs text-center leading-tight transition-colors ${
                  isActive
                    ? 'font-black text-[#046A47]'
                    : 'font-bold text-stone-800 group-hover:text-[#046A47]'
                }`}
              >
                {item.title}
              </span>
            </motion.button>
          );
        })}

        {/* Dynamic Main Categories from DB (if any, keeping icons neat) */}
        {categories
          .filter((c) => c.active)
          .slice(0, 4)
          .map((cat) => {
            const isActive = selectedCategoryId === cat.id;
            return (
              <motion.button
                key={cat.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  onSelectProductType('ALL');
                  onSelectCategory(isActive ? 'ALL' : cat.id);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-[72px] sm:w-[88px]"
              >
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden transition-all duration-200 shadow-xs border border-stone-200/60 ${
                    isActive
                      ? 'bg-[#046A47] text-white ring-4 ring-emerald-200'
                      : 'bg-stone-100 text-stone-700 group-hover:shadow-md'
                  }`}
                >
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sprout className="w-6 h-6 sm:w-7 sm:h-7" />
                  )}
                </div>
                <span
                  className={`text-[11px] sm:text-xs text-center leading-tight line-clamp-2 ${
                    isActive
                      ? 'font-black text-[#046A47]'
                      : 'font-bold text-stone-800 group-hover:text-[#046A47]'
                  }`}
                >
                  {cat.name}
                </span>
              </motion.button>
            );
          })}

        {/* Brands / Companies Story Shortcut */}
        {onOpenCompanies && (
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={onOpenCompanies}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group w-[72px] sm:w-[88px]"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-stone-900 text-amber-400 shadow-xs border border-stone-800 group-hover:shadow-md transition-all">
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="text-[11px] sm:text-xs text-center leading-tight font-bold text-stone-800 group-hover:text-[#046A47]">
              دليل الشركات
            </span>
          </motion.button>
        )}
      </div>
    </section>
  );
};
