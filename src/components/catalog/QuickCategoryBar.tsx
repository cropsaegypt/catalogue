import React from 'react';
import { Sparkles, Layers, Sprout, Droplets, ShieldAlert, Bug, ShieldCheck, Flame } from 'lucide-react';
import { Category } from '../../types';

interface QuickCategoryBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  selectedProductType?: string;
  onSelectProductType?: (type: string) => void;
}

export const QuickCategoryBar: React.FC<QuickCategoryBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  selectedProductType = 'ALL',
  onSelectProductType,
}) => {
  // Agricultural quick categories designed specifically for Egyptian farmers & dealers
  const quickItems = [
    {
      id: 'ALL',
      name: 'جميع المنتجات',
      icon: <Layers className="w-4 h-4" />,
      color: 'bg-emerald-700 text-white',
      filterType: 'cat',
      value: 'ALL',
    },
    {
      id: 'FERT_POWDER',
      name: 'أسمدة بودرة',
      badge: 'بودر / شكاير',
      icon: <Sprout className="w-4 h-4" />,
      color: 'bg-amber-600 text-white',
      filterType: 'type',
      value: 'fertilizer',
    },
    {
      id: 'STIM_LIQUID',
      name: 'مخصبات سائلة',
      badge: 'سوائل / لتر',
      icon: <Droplets className="w-4 h-4" />,
      color: 'bg-blue-600 text-white',
      filterType: 'type',
      value: 'stimulant',
    },
    {
      id: 'PEST_WEED',
      name: 'مبيدات حشائش',
      badge: 'مكافحة',
      icon: <ShieldAlert className="w-4 h-4" />,
      color: 'bg-rose-600 text-white',
      filterType: 'type',
      value: 'pesticide',
    },
    {
      id: 'PEST_INSECT',
      name: 'مبيدات حشرية',
      badge: 'ديدان ومنّ',
      icon: <Bug className="w-4 h-4" />,
      color: 'bg-purple-600 text-white',
      filterType: 'type',
      value: 'pesticide_insect',
    },
    {
      id: 'OFFERS',
      name: 'عروض الموسم',
      badge: 'تخفيضات',
      icon: <Flame className="w-4 h-4" />,
      color: 'bg-orange-600 text-white',
      filterType: 'special',
      value: 'featured',
    },
  ];

  return (
    <div className="w-full dir-rtl my-2 sm:my-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {quickItems.map((item) => {
          const isActive =
            item.filterType === 'cat' && selectedCategoryId === 'ALL' && selectedProductType === 'ALL'
              ? true
              : item.filterType === 'type' && selectedProductType === item.value;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.filterType === 'cat') {
                  onSelectCategory('ALL');
                  if (onSelectProductType) onSelectProductType('ALL');
                } else if (item.filterType === 'type' && onSelectProductType) {
                  onSelectProductType(isActive ? 'ALL' : item.value);
                  onSelectCategory('ALL');
                } else if (item.filterType === 'special' && onSelectProductType) {
                  onSelectProductType('featured');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#046A47] text-white border-[#046A47] shadow-sm font-black scale-102'
                  : 'bg-white hover:bg-emerald-50/60 text-gray-800 border-gray-200 hover:border-emerald-300'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 text-[#046A47]'
                }`}
              >
                {item.icon}
              </span>
              <div className="text-right">
                <span className="block leading-none text-xs">{item.name}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-normal leading-tight opacity-75 ${
                      isActive ? 'text-emerald-100' : 'text-gray-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
