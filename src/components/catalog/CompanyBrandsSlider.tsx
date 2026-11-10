import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Building2, CheckCircle2 } from 'lucide-react';
import { Company } from '../../types';

interface CompanyBrandsSliderProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelectCompany: (companyId: string) => void;
}

export const CompanyBrandsSlider: React.FC<CompanyBrandsSliderProps> = ({
  companies,
  selectedCompanyId,
  onSelectCompany,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeCompanies = companies.filter((c) => c.active);

  if (activeCompanies.length === 0) return null;

  const scrollByAmount = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = dir === 'left' ? -260 : 260;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className="space-y-3 dir-rtl">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#046A47] flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-stone-900">
              تسوق حسب الشركة والمصنع
            </h2>
            <p className="text-[11px] text-stone-500 font-medium">
              اضغط على شعار الشركة لعرض منتجاتها فقط
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedCompanyId !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectCompany('ALL')}
              className="text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer"
            >
              عرض كل الشركات
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByAmount('right')}
              className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 shadow-2xs cursor-pointer"
              title="السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByAmount('left')}
              className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-700 hover:bg-stone-100 shadow-2xs cursor-pointer"
              title="التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Slider */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none px-1"
      >
        {activeCompanies.map((company) => {
          const isSelected = selectedCompanyId === company.id;
          return (
            <motion.button
              key={company.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectCompany(isSelected ? 'ALL' : company.id)}
              className={`relative shrink-0 w-32 sm:w-36 p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2 text-center ${
                isSelected
                  ? 'bg-emerald-50/80 border-[#046A47] ring-2 ring-[#046A47]/20 shadow-sm'
                  : 'bg-white border-stone-200/80 hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 left-2 text-[#046A47]">
                  <CheckCircle2 className="w-4 h-4 fill-emerald-100" />
                </span>
              )}

              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center overflow-hidden p-1.5">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-stone-400" />
                )}
              </div>

              <span
                className={`text-xs font-black line-clamp-1 ${
                  isSelected ? 'text-[#046A47]' : 'text-stone-800'
                }`}
              >
                {company.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
