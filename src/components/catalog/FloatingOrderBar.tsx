import React from 'react';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

interface FloatingOrderBarProps {
  itemsCount: number;
  totalAmount: number;
  onOpenBasket: () => void;
}

export const FloatingOrderBar: React.FC<FloatingOrderBarProps> = ({
  itemsCount,
  totalAmount,
  onOpenBasket,
}) => {
  if (itemsCount === 0) return null;

  return (
    <div className="hidden md:block fixed bottom-5 inset-x-4 z-40 pointer-events-none dir-rtl animate-in slide-in-from-bottom-3 duration-200">
      <div className="max-w-xl mx-auto bg-stone-950/95 text-white rounded-2xl shadow-2xl border border-emerald-500/35 px-4 py-3 flex items-center justify-between gap-4 pointer-events-auto backdrop-blur-md">
        {/* Summary info */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-[#046A47] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-amber-300" />
            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-stone-950 font-black text-[10px] px-1.5 py-0.2 rounded-full shadow-sm">
              {itemsCount}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-300 font-bold">إجمالي الطلبية</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/30">
                كاش أو تقسيط
              </span>
            </div>
            <div className="text-lg font-black text-white flex items-baseline gap-1 leading-tight">
              <span>{Number(totalAmount || 0).toLocaleString('en-US')}</span>
              <span className="text-xs text-stone-300 font-bold">جنيه مصري</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          type="button"
          onClick={onOpenBasket}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black px-5 py-2.5 rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer text-sm shrink-0"
        >
          <span>إتمام الطلب والفاتورة</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
