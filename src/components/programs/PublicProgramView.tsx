import React, { useState } from 'react';
import {
  FileText,
  Share2,
  Download,
  Check,
  Sparkles,
  Phone,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  TrendingDown,
  Building2,
} from 'lucide-react';
import { AgronomicProgram } from '../../types';
import { exportProgramToPdf, ProgramPdfPrintable } from './ProgramPdfRenderer';

interface PublicProgramViewProps {
  program: AgronomicProgram;
  onNavigateHome: () => void;
  onOpenProductDetails?: (productId: string) => void;
}

export const PublicProgramView: React.FC<PublicProgramViewProps> = ({
  program,
  onNavigateHome,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportProgramToPdf(program);
    } catch (e) {
      console.error(e);
      alert('تعذر تحميل ملف PDF، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const generateWhatsAppMessage = () => {
    const lines = [
      `السلام عليكم، أرغب في تأكيد وطلب *${program.title}* من كروپسا:`,
      `🌾 *المحصول:* ${program.crop} (${program.areaAcres} فدان)`,
      `📋 *كود البرنامج:* ${program.id}`,
      `💰 *إجمالي العرض بعد الخصم:* ${program.finalTotal.toLocaleString('ar-EG')} جنيه`,
      `📦 *المركبات المطلوبة:*`,
      ...program.items.map(
        (it, idx) => `${idx + 1}. ${it.productName} (${it.companyName}) - عدد ${it.quantity}`
      ),
      `\nرابط البرنامج للمراجعة:\n${window.location.href}`,
    ];
    return encodeURIComponent(lines.join('\n'));
  };

  const whatsappUrl = `https://wa.me/201010100069?text=${generateWhatsAppMessage()}`;

  const soilLabels: Record<string, string> = {
    clay: 'تربة طينية',
    sandy: 'تربة رملية',
    calcareous: 'تربة كلسية جيرية',
    silt: 'تربة طميية',
    other: 'تربة متنوعة',
  };

  const irrigationLabels: Record<string, string> = {
    drip: 'تنقيط (شبكة)',
    flood: 'غمر',
    pivot: 'محوري (بيڤوت)',
    sprinkler: 'رشاشات',
    other: 'أخرى',
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-stone-900 font-sans dir-rtl pb-16">
      {/* Hidden printable DOM for PDF generation */}
      <ProgramPdfPrintable program={program} />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-3 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>الكتالوج الرئيسي</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'تم النسخ!' : 'مشاركة الرابط'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 bg-[#046A47] hover:bg-[#035338] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors shadow-xs"
            >
              <Download className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-bounce' : ''}`} />
              <span>{isExportingPdf ? 'جاري تجهيز PDF...' : 'تحميل PDF'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* 1. Hero Card */}
        <div className="bg-gradient-to-br from-[#046A47] via-[#046A47] to-[#02442d] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-emerald-100 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>برنامج زراعي ذكي معتمد • كروپسا</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black leading-tight text-white">
                {program.title}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-2xl">
                برنامج متكامل ومخصص لمساحة {program.areaAcres} فدان، تم إعداده هندسياً لمطابقة نوع التربة
                وظروف الزراعة وتحقيق أعلى إنتاجية وأعلى توفير.
              </p>
            </div>

            {program.totalSavings > 0 && (
              <div className="bg-amber-400 text-stone-950 px-4 py-3 rounded-2xl shadow-md text-center shrink-0">
                <span className="text-[10px] font-bold block uppercase tracking-wider text-stone-800">
                  وفرت في هذا العرض
                </span>
                <span className="text-xl sm:text-2xl font-black">
                  {program.totalSavings.toLocaleString('ar-EG')} ج
                </span>
              </div>
            )}
          </div>

          {/* Farm Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6 pt-6 border-t border-white/15 text-xs">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
              <span className="text-emerald-200/80 text-[10px] block">المحصول:</span>
              <span className="font-bold text-white text-sm">{program.crop}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
              <span className="text-emerald-200/80 text-[10px] block">المساحة:</span>
              <span className="font-bold text-white text-sm">{program.areaAcres} فدان</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
              <span className="text-emerald-200/80 text-[10px] block">طبيعة الأرض:</span>
              <span className="font-bold text-white text-sm">{soilLabels[program.soilType] || program.soilType}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
              <span className="text-emerald-200/80 text-[10px] block">نظام الري:</span>
              <span className="font-bold text-white text-sm">{irrigationLabels[program.irrigationType] || program.irrigationType}</span>
            </div>
          </div>
        </div>

        {/* 2. Marketing Pricing & Order Overview Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-500">السعر التجاري الإجمالي المرجعي:</span>
              <span className="text-sm font-bold text-stone-400 line-through">
                {program.originalTotal.toLocaleString('ar-EG')} جنيه
              </span>
            </div>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-xs font-bold text-stone-600">سعر البرنامج الخاص بك:</span>
              <span className="text-2xl sm:text-3xl font-black text-[#046A47]">
                {program.finalTotal.toLocaleString('ar-EG')} جنيه
              </span>
            </div>
            {program.totalSavings > 0 && (
              <span className="inline-block bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-0.5 rounded-full border border-emerald-200">
                خصم حصري معتمد بنسبة {program.globalDiscountPercent || Math.round((program.totalSavings / program.originalTotal) * 100)}%
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>طلب البرنامج عبر واتساب</span>
            </a>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 px-5 py-3.5 rounded-2xl font-bold text-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل نسخة PDF</span>
            </button>
          </div>
        </div>

        {/* 3. Recommended Products List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#046A47]" />
              <span>المركبات الموصى بها في البرنامج ({program.items.length} مركب)</span>
            </h2>
            <span className="text-xs text-stone-400 font-bold">جرعات وتوقيتات معتمدة</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {program.items.map((item, index) => {
              const hasDiscount = item.originalPrice > item.unitPrice;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs hover:shadow-sm transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-xl bg-stone-100 text-stone-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-stone-900">
                          {item.productName}
                        </h3>
                        <span className="bg-stone-100 text-stone-600 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                          {item.companyName}
                        </span>
                        {item.packageName && (
                          <span className="text-stone-400 text-xs font-medium">
                            • {item.packageName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-stone-600 font-medium flex-wrap">
                        <span className="text-[#046A47] font-bold">الجرعة: {item.dose}</span>
                        <span>•</span>
                        <span className="text-stone-500">التوقيت: {item.timing}</span>
                      </div>

                      {item.reason && (
                        <p className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-100 mt-1 max-w-xl">
                          💡 <strong>الهدف الزراعي:</strong> {item.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="w-full sm:w-auto sm:text-left pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex sm:flex-col justify-between items-baseline sm:items-end shrink-0">
                    <div className="text-right sm:text-left">
                      <span className="text-[10px] text-stone-400 block font-semibold">
                        الكمية: {item.quantity} عبوة
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-stone-400 font-bold line-through block">
                          {item.originalPrice.toLocaleString('ar-EG')} ج
                        </span>
                      )}
                      <span className="text-base font-black text-[#046A47]">
                        {item.unitPrice.toLocaleString('ar-EG')} ج / للعبوة
                      </span>
                    </div>

                    <div className="text-left font-black text-stone-900 text-sm sm:mt-1 bg-stone-50 px-2.5 py-1 rounded-lg">
                      الإجمالي: {item.totalPrice.toLocaleString('ar-EG')} ج
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Notes & Engineer Guidance */}
        {program.notes && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 text-xs text-amber-950 space-y-1">
            <span className="font-black text-sm block text-amber-900 mb-1">
              ملاحظات المهندس الزراعي:
            </span>
            <p className="leading-relaxed font-medium">{program.notes}</p>
          </div>
        )}

        {/* 5. Bottom Guarantee Banner */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#046A47] shrink-0" />
            <div>
              <span className="font-black text-stone-900 block text-sm">
                منتجات معتمدة 100% ومضمونة المصدر
              </span>
              <span className="text-stone-500 font-medium">
                جميع المركبات من كبرى الشركات الزراعية المعتمدة في مصر، بأسعار مباشرة وتوصيل لباب المزرعة.
              </span>
            </div>
          </div>
          <a
            href="tel:01010100069"
            className="hidden sm:flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-colors shrink-0"
          >
            <Phone className="w-3.5 h-3.5 text-[#046A47]" />
            <span>اتصل بنا: 01010100069</span>
          </a>
        </div>
      </main>
    </div>
  );
};
