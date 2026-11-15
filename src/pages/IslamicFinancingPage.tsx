import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  Send,
  ShoppingBag,
  Trash2,
  Upload,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Store,
  Sprout,
  Building,
  Calendar,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import { CatalogSettings, IslamicFinancingRequest, IslamicFinancingUploadedDoc, OrderItem } from '../types';
import { resolveIslamicFinancingConfig } from '../utils/islamicFinancingDefaults';
import { aiCatalogService } from '../services/aiCatalogService';
import { ensureFirestoreSafeImageUrl } from '../utils/imageCompression';

interface IslamicFinancingPageProps {
  settings: CatalogSettings;
  basketItems?: OrderItem[];
  onBackToCatalog: () => void;
  onSubmitFinancingRequest: (
    payload: Omit<IslamicFinancingRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt'>
  ) => Promise<IslamicFinancingRequest>;
}

const EGYPT_GOVERNORATES = [
  'البحيرة', 'كفر الشيخ', 'الدقهلية', 'الشرقية', 'الغربية', 'المنوفية',
  'القليوبية', 'الإسكندرية', 'الجيزة', 'القاهرة', 'الفيوم', 'بني سويف',
  'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'الإسماعيلية',
  'السويس', 'بورسعيد', 'دمياط', 'مطروح', 'الوادي الجديد', 'شمال سيناء', 'جنوب سيناء',
];

export const IslamicFinancingPage: React.FC<IslamicFinancingPageProps> = ({
  settings,
  basketItems = [],
  onBackToCatalog,
  onSubmitFinancingRequest,
}) => {
  const config = resolveIslamicFinancingConfig(settings);
  const basketTotal = basketItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);

  const formSectionRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [openFaqId, setOpenFaqId] = useState<string | null>(config.faqs[0]?.id || null);

  // Applicant Basic Info
  const [applicantName, setApplicantName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('البحيرة');
  const [city, setCity] = useState('');

  // 1. Applicant Type: Merchant vs Farmer vs Company
  const [applicantType, setApplicantType] = useState<'merchant' | 'farmer' | 'company'>('merchant');

  // Specific fields for Merchant:
  // - "عايز طلبية بكام؟" -> requestedAmount
  // - اسم المحل / النشاط التجاري -> merchantStoreName
  const [merchantStoreName, setMerchantStoreName] = useState('');

  // Specific fields for Farmer:
  // - طبيعة حيازة الأرض (تمليك / إيجار / تقنين) -> landTenure
  const [landTenure, setLandTenure] = useState<'owned' | 'rent' | 'legalization'>('owned');
  // - المساحة المنزرعة -> farmArea
  const [farmArea, setFarmArea] = useState('');
  // - المحصول -> farmerCrops
  const [farmerCrops, setFarmerCrops] = useState('');

  // Total Financing / Order Amount
  const [requestedAmount, setRequestedAmount] = useState<string>(
    basketTotal > 0 ? String(basketTotal) : ''
  );

  // 2. Repayment Method & Duration Logic
  // For Merchant:
  //   paymentMethod: 'monthly' (from 4 to 12 months, or 'more_than_12')
  //   paymentMethod: 'deferred' (fixed 3 months)
  // For Farmer:
  //   paymentMethod: 'deferred' (3, 4, 5, 6 months)
  //   paymentMethod: 'monthly' (3 to 12 months, or 'more_than_12')
  const [paymentMethod, setPaymentMethod] = useState<'monthly' | 'deferred'>('monthly');
  const [installmentMonths, setInstallmentMonths] = useState<number | 'more_than_12'>(6);
  const [deferredMonths, setDeferredMonths] = useState<number>(3);

  const [notes, setNotes] = useState('');
  const [attachBasket, setAttachBasket] = useState(basketItems.length > 0);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // Document uploads keyed by docId
  const [uploadedMap, setUploadedMap] = useState<Record<string, string>>({});
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<IslamicFinancingRequest | null>(null);

  // Smooth scroll helpers
  const scrollToForm = () => {
    const el = document.getElementById('financing-application-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 400);
    }
  };

  const scrollToFaq = () => {
    const el = document.getElementById('financing-faq-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Switch applicant type with corresponding defaults
  const handleSelectApplicantType = (type: 'merchant' | 'farmer' | 'company') => {
    setApplicantType(type);
    setFormError('');
    if (type === 'merchant') {
      setPaymentMethod('monthly');
      setInstallmentMonths(6);
      setDeferredMonths(3);
    } else {
      setPaymentMethod('deferred');
      setDeferredMonths(3);
      setInstallmentMonths(6);
    }
  };

  const handleUploadDoc = async (docId: string, file: File) => {
    setUploadingDocId(docId);
    setFormError('');
    try {
      const compressed = await aiCatalogService.compressImage(file, 900, 0.78);
      if (compressed) {
        const safeUrl = (await ensureFirestoreSafeImageUrl(compressed, 180_000)) || compressed;
        setUploadedMap((prev) => ({ ...prev, [docId]: safeUrl }));
      }
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!applicantName.trim() || !phone.trim()) {
      setFormError('يرجى إدخال الاسم ورقم الهاتف.');
      return;
    }

    if (applicantType === 'merchant') {
      if (!requestedAmount || Number(requestedAmount) <= 0) {
        setFormError('يرجى تحديد قيمة الطلبية المطلوبة (عايز طلبية بكام؟).');
        return;
      }
    } else if (applicantType === 'farmer') {
      if (!farmArea.trim()) {
        setFormError('يرجى كتابة المساحة المنزرعة (بالفدان أو القيراط).');
        return;
      }
      if (!requestedAmount || Number(requestedAmount) <= 0) {
        setFormError('يرجى إدخال قيمة التمويل أو المستلزمات المطلوبة بالجنيه.');
        return;
      }
    }

    // Validate required custom questions
    for (const q of config.customQuestions || []) {
      if (q.required && !String(customAnswers[q.id] || '').trim()) {
        setFormError(`يرجى الإجابة على السؤال: "${q.label}"`);
        return;
      }
    }

    // Validate required documents
    for (const reqDoc of config.requiredDocs) {
      if (reqDoc.required && !uploadedMap[reqDoc.id]) {
        setFormError(`يرجى رفع المستند المطلوب: "${reqDoc.label}"`);
        return;
      }
    }

    const uploadedDocs: IslamicFinancingUploadedDoc[] = config.requiredDocs
      .filter((d) => Boolean(uploadedMap[d.id]))
      .map((d) => ({
        docId: d.id,
        label: d.label,
        imageUrl: uploadedMap[d.id],
      }));

    const tenureLabels: Record<string, string> = {
      owned: 'تمليك',
      rent: 'إيجار',
      legalization: 'تقنين',
    };

    let calculatedRepaymentPlan: IslamicFinancingRequest['repaymentPlan'] = 'monthly_12';
    let planDetailedText = '';

    if (applicantType === 'merchant') {
      if (paymentMethod === 'monthly') {
        if (installmentMonths === 'more_than_12') {
          calculatedRepaymentPlan = 'monthly_12';
          planDetailedText = 'تقسيط شهري (أكثر من 12 شهر - بالتنسيق مع إدارة التقسيط)';
        } else if (installmentMonths <= 4) {
          calculatedRepaymentPlan = 'monthly_3';
          planDetailedText = `تقسيط شهري على ${installmentMonths} شهور`;
        } else if (installmentMonths <= 7) {
          calculatedRepaymentPlan = 'monthly_6';
          planDetailedText = `تقسيط شهري على ${installmentMonths} شهور`;
        } else {
          calculatedRepaymentPlan = 'monthly_12';
          planDetailedText = `تقسيط شهري على ${installmentMonths} شهراً`;
        }
      } else {
        calculatedRepaymentPlan = 'monthly_3';
        planDetailedText = 'سداد آجل (دفعة واحدة بعد 3 شهور)';
      }
    } else {
      // Farmer or other
      if (paymentMethod === 'deferred') {
        calculatedRepaymentPlan = deferredMonths === 3 ? 'monthly_3' : 'after_harvest';
        planDetailedText = `سداد آجل (دفعة واحدة بعد ${deferredMonths} شهور - مع المحصول)`;
      } else {
        if (installmentMonths === 'more_than_12') {
          calculatedRepaymentPlan = 'monthly_12';
          planDetailedText = 'تقسيط شهري (أكثر من 12 شهر - بالتنسيق مع إدارة التقسيط)';
        } else if (installmentMonths <= 4) {
          calculatedRepaymentPlan = 'monthly_3';
          planDetailedText = `تقسيط شهري على ${installmentMonths} شهور`;
        } else if (installmentMonths <= 7) {
          calculatedRepaymentPlan = 'monthly_6';
          planDetailedText = `تقسيط شهري على ${installmentMonths} شهور`;
        } else {
          calculatedRepaymentPlan = 'monthly_12';
          planDetailedText = `تقسيط شهري على ${installmentMonths} شهراً`;
        }
      }
    }

    const mergedCustomAnswers: Record<string, string> = {
      ...customAnswers,
      'صفة العميل': applicantType === 'merchant' ? 'تاجر / صاحب محل' : 'مزارع / صاحب مزرعة',
      'طريقة السداد': paymentMethod === 'monthly' ? 'تقسيط شهري' : 'سداد آجل',
      'خطة السداد التفصيلية': planDetailedText,
    };

    let finalFarmAreaOrScale = '';
    let finalCropsOrActivity = '';

    if (applicantType === 'merchant') {
      finalFarmAreaOrScale = `طلبية تجارية بقيمة ${Number(requestedAmount).toLocaleString('en-US')} ج.م`;
      finalCropsOrActivity = merchantStoreName.trim() || 'محل تجاري / موزع';
      mergedCustomAnswers['عايز طلبية بكام'] = `${Number(requestedAmount).toLocaleString('en-US')} ج.م`;
      if (merchantStoreName.trim()) {
        mergedCustomAnswers['اسم المحل والنشاط'] = merchantStoreName.trim();
      }
    } else {
      finalFarmAreaOrScale = `حيازة ${tenureLabels[landTenure]} - مساحة: ${farmArea.trim()}`;
      finalCropsOrActivity = farmerCrops.trim() || 'محاصيل زراعية متنوعة';
      mergedCustomAnswers['طبيعة حيازة الأرض'] = tenureLabels[landTenure];
      mergedCustomAnswers['المساحة المنزرعة'] = farmArea.trim();
      if (farmerCrops.trim()) {
        mergedCustomAnswers['المحصول'] = farmerCrops.trim();
      }
    }

    setIsSubmitting(true);
    try {
      const created = await onSubmitFinancingRequest({
        applicantName: applicantName.trim(),
        phone: phone.trim(),
        governorate,
        city: city.trim(),
        applicantType,
        farmAreaOrScale: finalFarmAreaOrScale,
        cropsOrActivity: finalCropsOrActivity,
        requestedAmount: Number(requestedAmount) || basketTotal || 0,
        repaymentPlan: calculatedRepaymentPlan,
        notes: notes.trim(),
        customAnswers: mergedCustomAnswers,
        uploadedDocs,
        linkedItems: attachBasket && basketItems.length > 0 ? basketItems : undefined,
      });
      setSubmittedRequest(created);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildWhatsAppLink = (req: IslamicFinancingRequest) => {
    const tenureLabels: Record<string, string> = {
      owned: 'تمليك',
      rent: 'إيجار',
      legalization: 'تقنين',
    };

    const detailedPlan =
      req.customAnswers?.['خطة السداد التفصيلية'] ||
      req.customAnswers?.['مدة السداد المختارة'] ||
      req.repaymentPlan;

    const msg = [
      `🕌 *طلب تمويل إسلامي جديد — كروپسا*`,
      `📄 رقم الطلب: ${req.requestNumber}`,
      `👤 الاسم: ${req.applicantName}`,
      `📞 الهاتف: ${req.phone}`,
      `📍 العنوان: ${req.governorate}${req.city ? ` - ${req.city}` : ''}`,
      `🏢 الصفة: ${req.applicantType === 'merchant' ? 'تاجر / صاحب محل' : 'مزارع / صاحب مزرعة'}`,
      req.applicantType === 'merchant'
        ? `🏪 المحل/النشاط: ${req.cropsOrActivity || '-'}`
        : `🌱 الحيازة: ${tenureLabels[landTenure]} | المساحة: ${farmArea || req.farmAreaOrScale || '-'}`,
      req.applicantType === 'farmer' && farmerCrops ? `🌾 المحصول: ${farmerCrops}` : null,
      `💰 قيمة الطلبية/التمويل المطلوب: ${Number(req.requestedAmount || 0).toLocaleString('en-US')} ج.م`,
      `🗓️ نظام وسداد التمويل: ${detailedPlan}`,
      req.notes ? `📝 ملاحظات: ${req.notes}` : null,
      `📎 المستندات المرفوعة: ${req.uploadedDocs.length} مستند`,
    ]
      .filter(Boolean)
      .join('\n');

    const cleanWa = (settings.whatsApp || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dir-rtl text-stone-900 pb-20">
      {/* Breadcrumb / Top Bar */}
      <div className="bg-white/80 backdrop-blur-xs border-b border-stone-200/80 px-3 sm:px-6 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToCatalog}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#046A47] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>الكتالوج الرئيسي</span>
            </button>
            <span className="text-stone-300">/</span>
            <span className="text-xs font-black text-[#046A47] flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5" />
              <span>بوابة التمويل الإسلامي بالمرابحة الشرعية</span>
            </span>
          </div>

          <button
            type="button"
            onClick={scrollToForm}
            className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-transform active:scale-95"
          >
            <span>قدم طلب</span>
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Hero Section with Dual CTAs: "قدم طلب" + "اعرف أكثر" */}
        <section className="bg-gradient-to-br from-[#046A47] via-[#03593B] to-[#023E29] text-white rounded-3xl p-5 sm:p-8 shadow-md space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 px-3 py-1 rounded-full text-[11px] font-black text-amber-300">
            <ShieldCheck className="w-4 h-4" />
            <span>تمويل إسلامي معتمد بالمرابحة الشرعية</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black leading-tight">{config.headline}</h1>

          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-2xl">
            {config.subheadline}
          </p>

          <div className="flex flex-wrap gap-2 text-[11px] font-black">
            <span className="bg-white/15 px-3 py-1 rounded-full">✓ بدون فوائد ربوية</span>
            <span className="bg-white/15 px-3 py-1 rounded-full">✓ سداد بعد الحصاد أو تقسيط شهري</span>
            <span className="bg-white/15 px-3 py-1 rounded-full">✓ رفع الأوراق إلكترونياً بسهولة</span>
          </div>

          {/* Action CTA Buttons: "قدم طلب" + "اعرف أكثر" */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={scrollToForm}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-2xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <FileCheck2 className="w-4 h-4 text-stone-950" />
              <span>قدم طلب تقسيط الآن</span>
            </button>

            <button
              type="button"
              onClick={scrollToFaq}
              className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl text-xs sm:text-sm border border-white/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-200" />
              <span>اعرف أكثر عن الشروط</span>
            </button>
          </div>
        </section>

        {/* Success Confirmation Screen */}
        {submittedRequest ? (
          <section className="bg-white rounded-3xl border-2 border-emerald-500/30 p-6 sm:p-8 shadow-lg text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-[#046A47] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-black bg-emerald-50 text-[#046A47] border border-emerald-200 px-3 py-1 rounded-full">
                تم تسجيل طلب التمويل الإسلامي بنجاح ✓
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 pt-2">
                رقم الطلب: <span className="font-mono text-[#046A47]">{submittedRequest.requestNumber}</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                تم استلام بياناتك بنجاح ({submittedRequest.uploadedDocs.length} مستندات مرفوعة). سيقوم مسؤول التمويل الإسلامي بمراجعة الأوراق والتواصل معك خلال 24–48 ساعة.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={buildWhatsAppLink(submittedRequest)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 bg-[#25D366] hover:bg-[#1fb857] text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>إرسال تأكيد الطلب واتساب</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setSubmittedRequest(null);
                  onBackToCatalog();
                }}
                className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs sm:text-sm font-black cursor-pointer"
              >
                العودة لتصفح الكتالوج
              </button>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* FAQ Section */}
            <section
              id="financing-faq-section"
              className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs space-y-3 scroll-mt-24"
            >
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <HelpCircle className="w-5 h-5 text-[#046A47]" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-stone-900">
                    أسئلة التمويل والتقسيط الشائعة
                  </h2>
                  <p className="text-[11px] text-stone-500 font-medium">
                    كل ما يهمك معرفته عن الشروط والأحكام
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {config.faqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="rounded-2xl border border-stone-200/90 overflow-hidden bg-stone-50/50"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="w-full p-3.5 text-right flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-50/40 transition-colors"
                      >
                        <span className="text-xs sm:text-sm font-black text-stone-800">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#046A47] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-3.5 pt-1 text-xs text-stone-600 font-medium leading-relaxed border-t border-stone-100 bg-white">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Application Form */}
            <section
              id="financing-application-form"
              ref={formSectionRef}
              className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-6 shadow-2xs space-y-5 scroll-mt-24"
            >
              <div className="border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-stone-900">
                      نموذج التقديم على التمويل الإسلامي
                    </h2>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">
                      املأ البيانات وسيقوم فريق التمويل بالتنسيق الفوري معك
                    </p>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black rounded-2xl flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Attach Current Basket Summary if non-empty */}
                {basketItems.length > 0 && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attachBasket}
                        onChange={(e) => {
                          setAttachBasket(e.target.checked);
                          if (e.target.checked && (!requestedAmount || Number(requestedAmount) <= 0)) {
                            setRequestedAmount(String(basketTotal));
                          }
                        }}
                        className="w-4 h-4 rounded accent-[#046A47]"
                      />
                      <span className="text-xs font-black text-[#046A47] flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          إرفاق منتجات السلة الحالية مع طلب التمويل ({basketItems.length} أصناف •{' '}
                          {basketTotal.toLocaleString('en-US')} ج.م)
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {/* 1. Applicant Role Selector (تاجر vs مزارع) */}
                <div>
                  <label className="text-xs font-black text-stone-800 block mb-2">
                    أنت بتقدم بصفتك: *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSelectApplicantType('merchant')}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer text-right ${
                        applicantType === 'merchant'
                          ? 'border-[#046A47] bg-emerald-50/70 shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          applicantType === 'merchant'
                            ? 'bg-[#046A47] text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-stone-900 block">
                          تاجر / صاحب محل
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium block">
                          محل مبيدات أو أسمدة أو موزع
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectApplicantType('farmer')}
                      className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer text-right ${
                        applicantType === 'farmer'
                          ? 'border-[#046A47] bg-emerald-50/70 shadow-xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          applicantType === 'farmer'
                            ? 'bg-[#046A47] text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        <Sprout className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black text-stone-900 block">
                          مزارع / صاحب مزرعة
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium block">
                          أرض زراعية أو مشروع إنتاجي
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Basic Personal Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      الاسم بالكامل *
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="مثال: الحاج محمود محمد علي"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      رقم الهاتف / الواتساب *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01000000000"
                      dir="ltr"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-right focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">المحافظة *</label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    >
                      {EGYPT_GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      المركز / القرية / العنوان
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="مثال: النوبارية - قرية..."
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>
                </div>

                {/* 2. Dynamic Questions: Merchant (تاجر) vs Farmer (مزارع) */}
                {applicantType === 'merchant' ? (
                  /* MERCHANT SPECIFIC FIELDS */
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                          <span>💰 عايز طلبية بكام؟ (قيمة الطلبية المطلوبة بالجنيه) *</span>
                        </label>
                        {basketTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => setRequestedAmount(String(basketTotal))}
                            className="text-[10px] font-black text-[#046A47] hover:underline cursor-pointer"
                          >
                            استخدام سلة المشتريات ({basketTotal.toLocaleString('en-US')} ج.م)
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          required
                          value={requestedAmount}
                          onChange={(e) => setRequestedAmount(e.target.value)}
                          placeholder="مثال: 50,000"
                          className="w-full p-2.5 pl-12 bg-white border border-amber-300 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-stone-500">
                          ج.م
                        </span>
                      </div>

                      {/* Quick Amount Suggestion Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {[25000, 50000, 100000, 200000, 500000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setRequestedAmount(String(amt))}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                              requestedAmount === String(amt)
                                ? 'bg-amber-400 text-stone-950 border-amber-500'
                                : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {amt.toLocaleString('en-US')} ج.م
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-800 block mb-1">
                        اسم المحل والنشاط التجاري *
                      </label>
                      <input
                        type="text"
                        required
                        value={merchantStoreName}
                        onChange={(e) => setMerchantStoreName(e.target.value)}
                        placeholder="مثال: محل الحرمين لتجارة وتوزيع الأسمدة والمبيدات"
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                      />
                    </div>
                  </div>
                ) : (
                  /* FARMER SPECIFIC FIELDS */
                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-3.5">
                    {/* Land Tenure: تمليك / إيجار / تقنين */}
                    <div>
                      <label className="text-xs font-black text-stone-900 block mb-1.5">
                        طبيعة حيازة الأرض الزراعية: *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'owned', label: 'تمليك' },
                          { id: 'rent', label: 'إيجار' },
                          { id: 'legalization', label: 'تقنين' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setLandTenure(t.id as any)}
                            className={`py-2 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              landTenure === t.id
                                ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                                : 'bg-white text-stone-700 border-emerald-200 hover:bg-emerald-100/60'
                            }`}
                          >
                            {landTenure === t.id && <Check className="w-3.5 h-3.5 text-amber-300" />}
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-stone-800 block mb-1">
                          المساحة المنزرعة *
                        </label>
                        <input
                          type="text"
                          required
                          value={farmArea}
                          onChange={(e) => setFarmArea(e.target.value)}
                          placeholder="مثال: 10 أفدنة، 15 قيراط..."
                          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-800 block mb-1">
                          المحاصيل المزروعة حالياً أو القادمة
                        </label>
                        <input
                          type="text"
                          value={farmerCrops}
                          onChange={(e) => setFarmerCrops(e.target.value)}
                          placeholder="مثال: بطاطس، طماطم، قمح، بنجر..."
                          className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-stone-800">
                          قيمة المستلزمات / التمويل المطلوب (ج.م) *
                        </label>
                        {basketTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => setRequestedAmount(String(basketTotal))}
                            className="text-[10px] font-black text-[#046A47] hover:underline cursor-pointer"
                          >
                            استخدام سلة المشتريات ({basketTotal.toLocaleString('en-US')} ج.م)
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          required
                          value={requestedAmount}
                          onChange={(e) => setRequestedAmount(e.target.value)}
                          placeholder="مثال: 50,000"
                          className="w-full p-2.5 pl-12 bg-white border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-stone-500">
                          ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Repayment & Installment Duration Selection */}
                <div className="bg-stone-50/80 border border-stone-200 rounded-2xl p-4 space-y-3.5">
                  <div className="border-b border-stone-200/70 pb-2">
                    <span className="text-xs font-black text-stone-900 block">
                      🗓️ نظام وخطة السداد: *
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium block mt-0.5">
                      {applicantType === 'merchant'
                        ? 'اختر بين التقسيط الشهري الميسر أو السداد الآجل'
                        : 'اختر بين السداد الآجل مع بيع المحصول أو التقسيط الشهري'}
                    </span>
                  </div>

                  {/* Step A: Choose Method (شهري vs آجل) */}
                  <div className="grid grid-cols-2 gap-2">
                    {applicantType === 'merchant' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('monthly');
                            setInstallmentMonths(6);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            paymentMethod === 'monthly'
                              ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                          }`}
                        >
                          تقسيط شهري
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('deferred');
                            setDeferredMonths(3);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            paymentMethod === 'deferred'
                              ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                          }`}
                        >
                          سداد آجل (دفعة واحدة)
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('deferred');
                            setDeferredMonths(3);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            paymentMethod === 'deferred'
                              ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                          }`}
                        >
                          سداد آجل (مع المحصول)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('monthly');
                            setInstallmentMonths(6);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            paymentMethod === 'monthly'
                              ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                          }`}
                        >
                          تقسيط شهري
                        </button>
                      </>
                    )}
                  </div>

                  {/* Step B: Durations based on role & method */}
                  {applicantType === 'merchant' && paymentMethod === 'monthly' && (
                    /* MERCHANT - MONTHLY (من بعد 3 شهور لحد 12 شهر + أكثر من 12 شهر) */
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-stone-700 block">
                        اختر مدة التقسيط بالشهور (من 4 شهور حتى 12 شهراً):
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setInstallmentMonths(m)}
                            className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                              installmentMonths === m
                                ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                            }`}
                          >
                            {m} شهور
                          </button>
                        ))}
                      </div>

                      {/* Option for > 12 Months */}
                      <button
                        type="button"
                        onClick={() => setInstallmentMonths('more_than_12')}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          installmentMonths === 'more_than_12'
                            ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-xs'
                            : 'bg-white text-stone-800 border-stone-200 hover:bg-amber-50'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>عايز أكثر من 12 شهر (تسهيلات خاصة)</span>
                      </button>

                      {installmentMonths === 'more_than_12' && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-[#046A47] leading-relaxed animate-in fade-in">
                          💬 <strong>إدارة التقسيط هتنسقها معاك:</strong> سيقوم فريق التمويل والتسهيلات الائتمانية بدراسة التسهيل المناسب وتنسيق المدة الأطول المناسبة لحجم أعمالك هاتفياً فور استلام الطلب.
                        </div>
                      )}
                    </div>
                  )}

                  {applicantType === 'merchant' && paymentMethod === 'deferred' && (
                    /* MERCHANT - DEFERRED (فقط 3 شهور) */
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-stone-700 block">
                        مدة السداد الآجل المتاحة للتجار:
                      </span>
                      <div className="p-3 bg-white border-2 border-[#046A47] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#046A47]" />
                          <span className="text-xs font-black text-stone-900">
                            3 شهور (سداد دفعة واحدة بعد 3 شهور)
                          </span>
                        </div>
                        <span className="text-[10px] font-black bg-emerald-100 text-[#046A47] px-2 py-0.5 rounded-md">
                          متاح
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">
                        * يتم سداد إجمالي قيمة الفاتورة دفعة واحدة عند استحقاق الـ 3 شهور.
                      </p>
                    </div>
                  )}

                  {applicantType === 'farmer' && paymentMethod === 'deferred' && (
                    /* FARMER - DEFERRED (3, 4, 5, 6 شهور) */
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-stone-700 block">
                        اختر مدة السداد الآجل (مع موسم الحصاد وبيع المحصول):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[3, 4, 5, 6].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDeferredMonths(m)}
                            className={`py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                              deferredMonths === m
                                ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                            }`}
                          >
                            {m} شهور (آجل)
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">
                        * يتم السداد دفعة واحدة عند حصاد المحصول خلال المدة المحددة (من 3 إلى 6 أشهر).
                      </p>
                    </div>
                  )}

                  {applicantType === 'farmer' && paymentMethod === 'monthly' && (
                    /* FARMER - MONTHLY (حتى 12 شهر + أكثر من 12 شهر) */
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-stone-700 block">
                        اختر مدة التقسيط بالشهور (أقساط شهرية حتى 12 شهراً):
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setInstallmentMonths(m)}
                            className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                              installmentMonths === m
                                ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                            }`}
                          >
                            {m} شهور
                          </button>
                        ))}
                      </div>

                      {/* Option for > 12 Months */}
                      <button
                        type="button"
                        onClick={() => setInstallmentMonths('more_than_12')}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          installmentMonths === 'more_than_12'
                            ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-xs'
                            : 'bg-white text-stone-800 border-stone-200 hover:bg-amber-50'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>عايز أكثر من 12 شهر (تنسيق مخصص)</span>
                      </button>

                      {installmentMonths === 'more_than_12' && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-[#046A47] leading-relaxed animate-in fade-in">
                          💬 <strong>إدارة التقسيط هتنسقها معاك:</strong> سيقوم مسؤول التمويل الزراعي بالتواصل معك لتحديد جدول دفعات ميسر يناسب دوراتك الزراعية.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Dynamic Questions from Dashboard */}
                {(config.customQuestions || []).map((q) => (
                  <div key={q.id}>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      {q.label} {q.required ? '*' : ''}
                    </label>
                    <input
                      type="text"
                      required={Boolean(q.required)}
                      value={customAnswers[q.id] || ''}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder={q.placeholder || 'اكتب إجابتك هنا...'}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>
                ))}

                {/* Required Document Uploads Section */}
                <div className="space-y-2.5 pt-2 border-t border-stone-100">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-stone-900">
                      المستندات والأوراق المطلوب رفعها:
                    </h3>
                    <p className="text-[11px] text-stone-500 font-medium">
                      صوّر الأوراق بالموبايل أو ارفعها من الاستوديو وسيتم ضغطها وتأمينها تلقائياً
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {config.requiredDocs.map((reqDoc) => {
                      const uploadedUrl = uploadedMap[reqDoc.id];
                      const isBusy = uploadingDocId === reqDoc.id;

                      return (
                        <div
                          key={reqDoc.id}
                          className={`p-3 rounded-2xl border-2 transition-all space-y-2 ${
                            uploadedUrl
                              ? 'bg-emerald-50/40 border-emerald-300'
                              : 'bg-stone-50/70 border-dashed border-stone-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-black text-stone-900 block">
                                {reqDoc.label}{' '}
                                {reqDoc.required && <span className="text-rose-600">*</span>}
                              </span>
                              {reqDoc.description && (
                                <span className="text-[10px] text-stone-500 font-medium block mt-0.5">
                                  {reqDoc.description}
                                </span>
                              )}
                            </div>

                            {uploadedUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setUploadedMap((prev) => {
                                    const copy = { ...prev };
                                    delete copy[reqDoc.id];
                                    return copy;
                                  })
                                }
                                className="p-1 bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
                                title="حذف الصورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {uploadedUrl ? (
                            <div className="relative h-24 rounded-xl overflow-hidden bg-white border border-emerald-200 flex items-center justify-center p-1">
                              <img
                                src={uploadedUrl}
                                alt={reqDoc.label}
                                className="max-h-full max-w-full object-contain"
                              />
                              <span className="absolute bottom-1 right-1 bg-[#046A47] text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                <FileCheck2 className="w-3 h-3" />
                                <span>تم الرفع</span>
                              </span>
                            </div>
                          ) : (
                            <label className="w-full py-2.5 bg-white hover:bg-emerald-50 border border-stone-200 rounded-xl text-xs font-black text-[#046A47] flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                              {isBusy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span>{isBusy ? 'جاري تجهيز الصورة...' : 'اختيار / تصوير المستند'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isBusy}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = '';
                                  if (f) void handleUploadDoc(reqDoc.id, f);
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">ملاحظات إضافية</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي تفاصيل أخرى تود إضافتها لإدارة التمويل..."
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                  />
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-[#046A47] hover:bg-[#035237] disabled:opacity-60 text-white rounded-2xl text-sm font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'جاري إرسال طلب التمويل...' : 'إرسال طلب التمويل الإسلامي'}</span>
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
