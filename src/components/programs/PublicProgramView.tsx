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
  ChevronDown,
  ChevronUp,
  Droplets,
  Sprout,
  Sun,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { AgronomicProgram } from '../../types';
import { exportProgramToPdf, ProgramPdfPrintable } from './ProgramPdfRenderer';
import { getProgramAgronomicGuide } from '../../services/agronomicGuideService';

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
  const [activeStageTab, setActiveStageTab] = useState<number>(0);

  const guide = getProgramAgronomicGuide(
    program.crop,
    program.soilType,
    program.irrigationType,
    program.programType,
    program.areaAcres
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportProgramToPdf(program);
    } catch (e: any) {
      console.error('PDF export failed:', e);
      alert(e?.message || 'تعذر تحميل ملف PDF، يرجى المحاولة مرة أخرى.');
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

  const salesPhone = program.salesRepPhone || '01010100069';
  const cleanPhone = salesPhone.replace(/\D/g, '');
  const whatsappTarget = cleanPhone.startsWith('2') ? cleanPhone : `2${cleanPhone}`;
  const whatsappUrl = `https://wa.me/${whatsappTarget || '201010100069'}?text=${generateWhatsAppMessage()}`;

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

  const stageBadgeColors = [
    { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200' },
    { bg: 'bg-teal-500', text: 'text-teal-500', light: 'bg-teal-50', border: 'border-teal-200' },
    { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-50', border: 'border-amber-200' },
    { bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-50', border: 'border-rose-200' },
    { bg: 'bg-purple-500', text: 'text-purple-500', light: 'bg-purple-50', border: 'border-purple-200' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-stone-900 font-sans dir-rtl pb-20">
      {/* Offscreen printable DOM for PDF generation */}
      <ProgramPdfPrintable program={program} />

      {/* Top Sticky Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-3 sm:px-8 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl cursor-pointer transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>الكتالوج الرئيسي</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'تم نسخ الرابط!' : 'مشاركة الرابط'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 bg-[#046A47] hover:bg-[#035338] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-bounce' : ''}`} />
              <span>{isExportingPdf ? 'جاري تجهيز PDF...' : 'تحميل PDF 📄'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 space-y-7">
        {/* ================= 1. Hero Card ================= */}
        <div className="bg-gradient-to-br from-[#046A47] via-[#046A47] to-[#02442d] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -left-12 -bottom-12 w-56 h-56 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-emerald-100 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>برنامج زراعي ذكي معتمد • كروپسا</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black leading-tight text-white">
                {program.title}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-2xl leading-relaxed">
                برنامج متكامل ومخصص لمساحة {program.areaAcres} فدان، تم إعداده هندسياً لمطابقة نوع التربة
                وظروف المزرعة وتحقيق أعلى إنتاجية وأعلى توفير اقتصادي.
              </p>
            </div>

            {program.totalSavings > 0 && (
              <div className="bg-amber-400 text-stone-950 px-5 py-3.5 rounded-2xl shadow-lg text-center shrink-0">
                <span className="text-[11px] font-black block uppercase tracking-wider text-stone-900">
                  وفرت في هذا العرض
                </span>
                <span className="text-2xl sm:text-3xl font-black text-stone-950">
                  {program.totalSavings.toLocaleString('ar-EG')} ج
                </span>
              </div>
            )}
          </div>

          {/* Farm Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-6 pt-6 border-t border-white/15 text-xs">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
              <span className="text-emerald-200/80 text-[10px] block font-semibold">المحصول:</span>
              <span className="font-black text-white text-base">{program.crop}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
              <span className="text-emerald-200/80 text-[10px] block font-semibold">المساحة المستهدفة:</span>
              <span className="font-black text-white text-base">{program.areaAcres} فدان</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
              <span className="text-emerald-200/80 text-[10px] block font-semibold">طبيعة الأرض:</span>
              <span className="font-black text-white text-base">{soilLabels[program.soilType] || program.soilType}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3">
              <span className="text-emerald-200/80 text-[10px] block font-semibold">نظام الري:</span>
              <span className="font-black text-white text-base">{irrigationLabels[program.irrigationType] || program.irrigationType}</span>
            </div>
          </div>
        </div>

        {/* ================= 2. Marketing Pricing & Order Overview Card ================= */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-500">السعر التجاري الإجمالي المرجعي:</span>
              <span className="text-base font-bold text-stone-400 line-through">
                {program.originalTotal.toLocaleString('ar-EG')} جنيه
              </span>
            </div>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-xs font-bold text-stone-700">سعر البرنامج المعتمد لك:</span>
              <span className="text-2xl sm:text-4xl font-black text-[#046A47]">
                {program.finalTotal.toLocaleString('ar-EG')} جنيه
              </span>
            </div>
            {program.totalSavings > 0 && (
              <span className="inline-block bg-emerald-50 text-emerald-800 text-xs font-black px-3.5 py-1 rounded-full border border-emerald-200">
                خصم حصري معتمد بنسبة {program.globalDiscountPercent || Math.round((program.totalSavings / program.originalTotal) * 100)}%
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-7 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>تأكيد وطلب البرنامج عبر واتساب</span>
            </a>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 px-5 py-3.5 rounded-2xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>تحميل نسخة PDF</span>
            </button>
          </div>
        </div>

        {/* ================= 3. Recommended Products List ================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-black text-stone-900 flex items-center gap-2">
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
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#046A47] text-xs font-black flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                      {index + 1}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-stone-900">
                          {item.productName}
                        </h3>
                        <span className="bg-stone-100 text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-stone-200/60">
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
                        <p className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-xl border border-stone-100 mt-1 max-w-xl">
                          💡 <strong>الهدف الزراعي:</strong> {item.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="w-full sm:w-auto sm:text-left pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 flex sm:flex-col justify-between items-baseline sm:items-end shrink-0">
                    <div className="text-right sm:text-left">
                      <span className="text-[11px] text-stone-400 block font-semibold">
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

                    <div className="text-left font-black text-stone-900 text-sm sm:mt-1 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100">
                      الإجمالي: {item.totalPrice.toLocaleString('ar-EG')} ج
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= 4. ILLUSTRATED AGRONOMIC GUIDE SECTION ================= */}
        {/* "شرح للبرنامج بصور وكدا حاجة رايقة" */}
        <section className="bg-white rounded-3xl p-5 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
          <div className="border-b border-stone-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#046A47] bg-emerald-50 px-3 py-1 rounded-full">
                <Sprout className="w-3.5 h-3.5" />
                <span>بروتوكول حقلي مصور ومعتمد</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-stone-900">
                {guide.title}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                {guide.subtitle}
              </p>
            </div>

            <span className="text-xs font-bold text-[#046A47] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
              5 مراحل نمو مدروسة 🌿
            </span>
          </div>

          {/* Stage Tabs Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {guide.stages.map((stg, sIndex) => {
              const isActive = activeStageTab === sIndex;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => setActiveStageTab(sIndex)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    isActive
                      ? 'border-[#046A47] bg-emerald-50/70 ring-2 ring-[#046A47] shadow-xs'
                      : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  <span className="text-xl">{stg.icon}</span>
                  <span className="text-xs font-black block leading-tight">
                    {stg.stageName.replace('مرحلة ', '')}
                  </span>
                  <span className="text-[10px] text-stone-400 font-semibold">
                    المرحلة {sIndex + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Stage Detail Visual Card */}
          {guide.stages[activeStageTab] && (() => {
            const currentStage = guide.stages[activeStageTab];
            const badge = stageBadgeColors[activeStageTab % stageBadgeColors.length];
            return (
              <div className={`p-5 sm:p-6 rounded-3xl border ${badge.border} ${badge.light} space-y-4 animate-in fade-in duration-200`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/60 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center text-2xl shrink-0 border border-stone-200/60">
                      {currentStage.icon}
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900">
                        {currentStage.stageName}
                      </h3>
                      <p className="text-xs text-stone-600 font-medium">
                        {currentStage.stageSubtitle}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl bg-white shadow-xs border ${badge.border} ${badge.text}`}>
                    المرحلة {activeStageTab + 1} من 5
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Goals */}
                  <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>الأهداف الفسيولوجية للمرحلة:</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-stone-600">
                      {currentStage.goals.map((g, gIdx) => (
                        <li key={gIdx} className="flex items-start gap-2">
                          <span className="text-[#046A47] font-bold mt-0.5">✓</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Practices */}
                  <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-black text-[#046A47] flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-teal-600" />
                      <span>المعاملة والتسميد المقترح:</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-stone-600">
                      {currentStage.recommendedPractices.map((p, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2">
                          <span className="text-teal-600 font-bold mt-0.5">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Engineer Tip */}
                <div className="bg-white/80 p-3.5 rounded-2xl border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2.5">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    <strong className="font-black text-emerald-900 block mb-0.5">نصيحة المهندس الميدانية:</strong>
                    <span className="font-medium text-stone-700 leading-relaxed">{currentStage.engineerTip}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Soil & Irrigation Customized Guidelines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-stone-50 border border-stone-200/80 p-5 rounded-3xl space-y-2.5">
              <div className="flex items-center gap-2 text-stone-900 font-black text-sm">
                <span className="text-lg">📍</span>
                <span>{guide.soilAdvice.title}</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {guide.soilAdvice.description}
              </p>
              <ul className="space-y-1 text-xs text-stone-700 pt-1">
                {guide.soilAdvice.keyPoints.map((kp, kIdx) => (
                  <li key={kIdx} className="flex items-start gap-1.5">
                    <span className="text-[#046A47] font-bold">•</span>
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-stone-50 border border-stone-200/80 p-5 rounded-3xl space-y-2.5">
              <div className="flex items-center gap-2 text-stone-900 font-black text-sm">
                <span className="text-lg">💧</span>
                <span>{guide.irrigationAdvice.title}</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {guide.irrigationAdvice.description}
              </p>
              <ul className="space-y-1 text-xs text-stone-700 pt-1">
                {guide.irrigationAdvice.keyPoints.map((kp, kIdx) => (
                  <li key={kIdx} className="flex items-start gap-1.5">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Spraying Rules & PHI Caution */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 sm:p-5 rounded-3xl text-xs space-y-2 text-amber-950">
            <span className="font-black text-sm text-amber-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>إرشادات الرش والخلط وفترات الأمان (PHI):</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700">
              {guide.sprayingBestPractices.map((bp, bpIdx) => (
                <div key={bpIdx} className="flex items-start gap-1.5">
                  <span className="text-amber-700 font-bold">•</span>
                  <span>{bp}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= 5. Notes & Engineer Guidance ================= */}
        {program.notes && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-3xl p-5 sm:p-6 text-xs text-amber-950 space-y-1.5 shadow-2xs">
            <span className="font-black text-sm block text-amber-900 mb-1 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600" />
              <span>ملاحظات المهندس الزراعي المشرف:</span>
            </span>
            <p className="leading-relaxed font-semibold text-stone-800 text-sm">{program.notes}</p>
          </div>
        )}

        {/* ================= 6. Bottom Guarantee Banner ================= */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-xs">
          <div className="flex items-center gap-3.5">
            <ShieldCheck className="w-9 h-9 text-[#046A47] shrink-0" />
            <div>
              <span className="font-black text-stone-900 block text-sm sm:text-base">
                منتجات معتمدة 100% ومضمونة المصدر
              </span>
              <span className="text-stone-500 font-medium">
                جميع المركبات من كبرى الشركات الزراعية المعتمدة في مصر، بأسعار مباشرة وتوصيل لباب المزرعة.
              </span>
            </div>
          </div>
          <a
            href={`tel:${salesPhone}`}
            className="flex items-center gap-1.5 bg-[#046A47] hover:bg-[#035338] text-white px-5 py-2.5 rounded-xl font-bold cursor-pointer transition-colors shrink-0 shadow-xs"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>اتصل بالمهندس: {salesPhone}</span>
          </a>
        </div>
      </main>
    </div>
  );
};
