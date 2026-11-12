import React, { useState } from 'react';
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

  const [openFaqId, setOpenFaqId] = useState<string | null>(config.faqs[0]?.id || null);

  // Applicant Form State
  const [applicantName, setApplicantName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('البحيرة');
  const [city, setCity] = useState('');
  const [applicantType, setApplicantType] = useState<'farmer' | 'merchant' | 'company'>('farmer');
  const [farmAreaOrScale, setFarmAreaOrScale] = useState('');
  const [cropsOrActivity, setCropsOrActivity] = useState('');
  const [requestedAmount, setRequestedAmount] = useState<string>(
    basketTotal > 0 ? String(basketTotal) : ''
  );
  const [repaymentPlan, setRepaymentPlan] = useState<
    'after_harvest' | 'monthly_3' | 'monthly_6' | 'monthly_12'
  >('after_harvest');
  const [notes, setNotes] = useState('');
  const [attachBasket, setAttachBasket] = useState(basketItems.length > 0);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // Document uploads keyed by docId
  const [uploadedMap, setUploadedMap] = useState<Record<string, string>>({});
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<IslamicFinancingRequest | null>(null);

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

    setIsSubmitting(true);
    try {
      const created = await onSubmitFinancingRequest({
        applicantName: applicantName.trim(),
        phone: phone.trim(),
        governorate,
        city: city.trim(),
        applicantType,
        farmAreaOrScale: farmAreaOrScale.trim(),
        cropsOrActivity: cropsOrActivity.trim(),
        requestedAmount: Number(requestedAmount) || basketTotal || 0,
        repaymentPlan,
        notes: notes.trim(),
        customAnswers,
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
    const planLabel: Record<string, string> = {
      after_harvest: 'سداد بعد الحصاد / موسمي',
      monthly_3: 'دفعات على 3 شهور',
      monthly_6: 'دفعات على 6 شهور',
      monthly_12: 'دفعات على 12 شهراً',
    };
    const msg = [
      `🕌 *طلب تمويل إسلامي جديد — كروپسا*`,
      `📄 رقم الطلب: ${req.requestNumber}`,
      `👤 الاسم: ${req.applicantName}`,
      `📞 الهاتف: ${req.phone}`,
      `📍 العنوان: ${req.governorate}${req.city ? ` - ${req.city}` : ''}`,
      `🌱 النشاط/المساحة: ${req.farmAreaOrScale || '-'} (${req.cropsOrActivity || '-'})`,
      `💰 مبلغ التمويل المطلوب: ${Number(req.requestedAmount || 0).toLocaleString('en-US')} ج.م`,
      `🗓️ خطة السداد: ${planLabel[req.repaymentPlan] || req.repaymentPlan}`,
      `📎 المستندات المرفوعة بالموقع: ${req.uploadedDocs.length} مستند`,
    ].join('\n');

    const cleanWa = (settings.whatsApp || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dir-rtl text-stone-900 pb-16">
      {/* Sticky Minimal Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-3 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للكتالوج</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#046A47] text-white flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base font-black text-stone-900">
              بوابة التمويل الإسلامي
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6">
        {/* Hero Overview */}
        <section className="bg-gradient-to-br from-[#046A47] to-[#02442D] text-white rounded-3xl p-5 sm:p-8 shadow-md space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 px-3 py-1 rounded-full text-[11px] font-black text-amber-300">
            <ShieldCheck className="w-4 h-4" />
            <span>تمويل إسلامي بالمرابحة الشرعية</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black leading-tight">{config.headline}</h1>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-2xl">
            {config.subheadline}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-black">
            <span className="bg-white/15 px-3 py-1 rounded-full">✓ بدون فوائد ربوية</span>
            <span className="bg-white/15 px-3 py-1 rounded-full">✓ سداد بعد الحصاد أو دفعات</span>
            <span className="bg-white/15 px-3 py-1 rounded-full">✓ رفع الأوراق إلكترونياً بسهولة</span>
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
                تم استلام بياناتك والأوراق المرفوعة ({submittedRequest.uploadedDocs.length} مستند). سيقوم مسؤول التمويل الإسلامي بمراجعتها والتواصل معك خلال 24–48 ساعة.
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
            {/* LEFT / TOP ON MOBILE: Frequently Asked Questions */}
            <section className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                <HelpCircle className="w-5 h-5 text-[#046A47]" />
                <div>
                  <h2 className="text-sm sm:text-base font-black text-stone-900">
                    أسئلة التمويل الإسلامي الشائعة
                  </h2>
                  <p className="text-[11px] text-stone-500 font-medium">
                    كل ما تحتاج معرفته قبل التقديم
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

            {/* RIGHT / MAIN: Application Form + Questions + Uploaded Docs */}
            <section className="lg:col-span-7 bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-6 shadow-2xs space-y-5">
              <div className="border-b border-stone-100 pb-3">
                <h2 className="text-base sm:text-lg font-black text-stone-900">
                  تقديم طلب تمويل إسلامي جديد
                </h2>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  املأ البيانات وأجب على الأسئلة وارفع صور المستندات المطلوبة بالأسفل
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black rounded-2xl">
                  {formError}
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
                        onChange={(e) => setAttachBasket(e.target.checked)}
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

                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      الاسم بالكامل *
                    </label>
                    <input
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

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">صفة المتقدم</label>
                    <select
                      value={applicantType}
                      onChange={(e) => setApplicantType(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    >
                      <option value="farmer">مزارع / صاحب مزرعة</option>
                      <option value="merchant">تاجر / صاحب محل مبيدات وأسمدة</option>
                      <option value="company">مشروع / جمعية زراعية</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      المساحة المزروعة أو حجم النشاط
                    </label>
                    <input
                      type="text"
                      value={farmAreaOrScale}
                      onChange={(e) => setFarmAreaOrScale(e.target.value)}
                      placeholder="مثال: 15 فدان أو محل جملة"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      المحاصيل الرئيسية / نوع النشاط
                    </label>
                    <input
                      type="text"
                      value={cropsOrActivity}
                      onChange={(e) => setCropsOrActivity(e.target.value)}
                      placeholder="مثال: بطاطس وطماطم وموالح"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      قيمة التمويل التقريبية (ج.م)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(e.target.value)}
                      placeholder="مثال: 50000"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>
                </div>

                {/* Repayment Plan */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">
                    خطة السداد المناسبة لك:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'after_harvest', label: 'بعد الحصاد (موسمي)' },
                      { id: 'monthly_3', label: 'دفعات 3 شهور' },
                      { id: 'monthly_6', label: 'دفعات 6 شهور' },
                      { id: 'monthly_12', label: 'دفعات 12 شهراً' },
                    ].map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setRepaymentPlan(plan.id as any)}
                        className={`p-2.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                          repaymentPlan === plan.id
                            ? 'bg-[#046A47] text-white border-[#046A47]'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                        }`}
                      >
                        {plan.label}
                      </button>
                    ))}
                  </div>
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
                      صوّر الأوراق بالموبايل أو ارفعها من الاستوديو وسيتم ضغطها تلقائياً
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

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">ملاحظات إضافية</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي تفاصيل أخرى تود إضافتها لمسؤول التمويل..."
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-[#046A47] hover:bg-[#035237] disabled:opacity-60 text-white rounded-2xl text-sm font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
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
