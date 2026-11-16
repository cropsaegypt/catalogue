import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  Percent,
  CreditCard,
  Truck,
  ShieldCheck,
  MessageCircle,
  Flame,
  X,
} from 'lucide-react';
import { formatPhoneForWhatsApp } from '../../utils/salesRepReferral';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onStay: () => void;
  onExit: () => void;
  whatsAppNumber?: string;
  phone?: string;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  onStay,
  onExit,
  whatsAppNumber = '201000000000',
}) => {
  const cleanWa = formatPhoneForWhatsApp(whatsAppNumber);
  const waUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(
    'السلام عليكم، كنت بتصفح كتالوج كروپسا وعايز استفسر عن عروض الأسعار الحالية وتسهيلات التقسيط المتاحة للموسم الزراعي.'
  )}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 dir-rtl overflow-y-auto">
          {/* Dark Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm"
            onClick={onStay}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="relative bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border-2 border-emerald-600/30 overflow-hidden my-auto z-10"
          >
            {/* Top Decorative Background Accents */}
            <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-amber-400 via-[#046A47] to-emerald-400" />
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-600/15 rounded-full blur-2xl pointer-events-none" />

            {/* Close / Stay X Button */}
            <button
              type="button"
              onClick={onStay}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق والعودة للكتالوج"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content Body */}
            <div className="space-y-4 pt-1">
              {/* Marketing Attention Hook */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-black shadow-2xs">
                  <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
                  <span>عروض الموسم الزراعي مستنياك! ⏳</span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-stone-900 leading-tight">
                  استنى يا باشمهندس.. هل تريد الخروج من الكتالوج وتفويت أقوى عروض اليوم؟ 🌾
                </h3>

                <p className="text-xs text-stone-600 leading-relaxed font-medium">
                  لا تغادر الآن قبل أن تتعرف على خصومات وتسهيلات كروپسا المخصصة لدعم المزارعين والتجار:
                </p>
              </div>

              {/* Marketing Benefits Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                  <div className="w-8 h-8 rounded-xl bg-[#046A47] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Percent className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#046A47] block leading-tight">
                      خصم تجاري خاص
                    </span>
                    <span className="text-[11px] text-stone-600 font-medium">
                      أسعار جملة خاصة للمزارع الكبرى والموزعين
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-sky-50/70 border border-sky-200/80">
                  <div className="w-8 h-8 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CreditCard className="w-4 h-4 text-sky-200" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-sky-900 block leading-tight">
                      تقسيط زراعي 12 شهراً
                    </span>
                    <span className="text-[11px] text-stone-600 font-medium">
                      بدون تعقيدات بنكية والدفع بعد الحصاد
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Truck className="w-4 h-4 text-amber-100" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-amber-950 block leading-tight">
                      شحن مباشر لباب مزرعتك
                    </span>
                    <span className="text-[11px] text-stone-600 font-medium">
                      معاينة واستلام ودفع كاش عند الوصول
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-rose-50/70 border border-rose-200/80">
                  <div className="w-8 h-8 rounded-xl bg-rose-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-rose-200" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-rose-950 block leading-tight">
                      مركبات أصلية 100%
                    </span>
                    <span className="text-[11px] text-stone-600 font-medium">
                      مسجلة ومعتمدة بوزارة الزراعة المصرية
                    </span>
                  </div>
                </div>
              </div>

              {/* Promo Coupon Box */}
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-emerald-500/15 border-2 border-dashed border-amber-500/60 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-amber-900 block">
                    كوبون خصم زراعي إضافي خاص بك الآن:
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black text-[#046A47] tracking-wider block">
                    CROPSA20
                  </span>
                </div>
                <span className="bg-white text-stone-800 text-[10px] font-black px-2.5 py-1 rounded-xl shadow-2xs border border-amber-200 shrink-0">
                  خصم فوري 20%
                </span>
              </div>

              {/* Action Buttons: Pure Marketing Layout */}
              <div className="space-y-2 pt-1">
                {/* 1. Primary CTA: Stay in Catalog */}
                <button
                  type="button"
                  onClick={onStay}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#046A47] via-[#035A3C] to-[#023E29] hover:from-[#035A3C] hover:to-[#022C22] text-white text-sm font-black shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-300" />
                  <span>لا، خليني في الكتالوج وأكمل تصفح العروض والأسعار</span>
                </button>

                {/* 2. Direct WhatsApp Support Link */}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#046A47] text-xs font-black border border-emerald-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#046A47]" />
                  <span>استشارة زراعية مجانية سريعة عبر واتساب</span>
                </a>

                {/* 3. Secondary Quiet Action: Confirm Exit */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={onExit}
                    className="text-xs font-bold text-stone-400 hover:text-rose-600 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-rose-50"
                  >
                    نعم، أريد الخروج من الكتالوج الآن 👋
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
