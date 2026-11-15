import React from 'react';
import {
  X,
  BadgePercent,
  CheckCircle2,
  Building2,
  Sparkles,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';

interface WholesaleNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content?: string;
  phone?: string;
  whatsAppNumber?: string;
}

export const WholesaleNoticeModal: React.FC<WholesaleNoticeModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  whatsAppNumber = '201000000000',
}) => {
  if (!isOpen) return null;

  const defaultTitle = 'تنبيه الأسعار والخصومات التجارية';
  const defaultContent =
    'الأسعار المعروضة بالكتالوج هي الأسعار التجارية المعتمدة الخاصة بالموزعين والتجار والمزارع الكبرى، وهي أسعار مبدئية قبل احتساب خصومات الكميات وعروض السداد. بعد إرسال طلبيتك، سيتم التواصل معك مباشرة من إدارة البيع التجاري لتحديد الخصم التجاري الخاص بكم وتأكيد الفاتورة النهائية.';

  const displayTitle = title?.trim() || defaultTitle;
  const displayContent = content?.trim() || defaultContent;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 dir-rtl animate-in fade-in duration-200">
      {/* Backdrop (Click to dismiss instantly) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-xs transition-opacity cursor-pointer"
      />

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-gradient-to-l from-emerald-800 to-stone-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
              <BadgePercent className="w-6 h-6" />
            </div>
            <div className="min-w-0 pr-1">
              <span className="inline-block text-[10.5px] font-black text-amber-300 bg-white/10 px-2 py-0.5 rounded-md mb-1">
                إدارة المبيعات والتوزيع التجاري
              </span>
              <h3 className="text-base sm:text-lg font-black leading-snug truncate">
                {displayTitle}
              </h3>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4 text-stone-800">
          {/* Visual bullet cards for fast reading */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/90">
              <CheckCircle2 className="w-4 h-4 text-[#046A47] shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed text-emerald-950">
                <strong className="block text-emerald-900 mb-0.5">أسعار خاصة بالموزعين والتجار:</strong>
                الأسعار المعروضة بالكتالوج هي الأسعار التجارية المعتمدة.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed text-amber-950">
                <strong className="block text-amber-900 mb-0.5">أسعار مبدئية قبل الخصم:</strong>
                كافة الأسعار مبدئية ولا تشمل خصومات الكميات أو عروض السداد النقدي.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <Building2 className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed text-stone-800">
                <strong className="block text-stone-900 mb-0.5">تأكيد الخصم بعد عمل الطلبية:</strong>
                بمجرد إرسال طلبيتك، سيتم التواصل معك مباشرة من إدارة البيع التجاري لعمل الخصم وتأكيد التوريد النهائي.
              </div>
            </div>
          </div>

          {/* Custom Admin Paragraph if modified */}
          {content && content.trim() !== defaultContent && (
            <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/60 leading-relaxed font-medium">
              {content}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>فهمت، تصفح الكتالوج الآن</span>
            <ArrowLeft className="w-4 h-4" />
          </button>

          {whatsAppNumber && (
            <a
              href={`https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                'السلام عليكم، محتاج استفسار عن أسعار الجملة والخصومات التجارية.'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>استفسار واتساب</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
