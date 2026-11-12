import { CatalogSettings, IslamicFinancingConfig } from '../types';

export const DEFAULT_ISLAMIC_FINANCING_CONFIG: IslamicFinancingConfig = {
  headline: 'نظام التمويل الإسلامي بالمرابحة — كروپسا',
  subheadline:
    'تمويل شرعي 100% للأسمدة والمبيدات والمخصبات الزراعية بسعر معلوم وأنظمة سداد مرنة بعد الحصاد أو على دفعات بدون فوائد ربوية.',
  faqs: [
    {
      id: 'faq-1',
      question: 'ما هو نظام التمويل الإسلامي في كروپسا؟',
      answer:
        'هو نظام بيع بالمرابحة الشرعية؛ نقوم بتوفير جميع احتياجاتك من الأسمدة والمبيدات والمخصبات فوراً بسعر متفق عليه مسبقاً وبخطة سداد مريحة دون أي فوائد ربوية أو غرامات تأخير.',
    },
    {
      id: 'faq-2',
      question: 'من يحق له التقديم على طلب التمويل؟',
      answer:
        'متاح لجميع المزارعين وأصحاب المزارع والمحلات والتجار الزراعيين والمشاريع الزراعية داخل جميع محافظات مصر.',
    },
    {
      id: 'faq-3',
      question: 'ما هي المستندات والأوراق المطلوبة؟',
      answer:
        'صورة بطاقة الرقم القومي (وجه وظهر) + إثبات النشاط (بطاقة حيازة زراعية أو عقد إيجار أو سجل تجاري للمحلات)، ويتم رفعها بسهولة مباشرة من هذه الصفحة.',
    },
    {
      id: 'faq-4',
      question: 'كم تستغرق مراجعة الطلب ومتى يتم التوصيل؟',
      answer:
        'يتم فحص الطلب من فريق التمويل خلال 24 إلى 48 ساعة والتواصل معك هاتفياً لتأكيد التفاصيل وشحن المنتجات مباشرة لمزرعتك أو مخزنك.',
    },
  ],
  requiredDocs: [
    {
      id: 'doc-id-front',
      label: 'صورة البطاقة الشخصية (الوجه الأمامي)',
      description: 'صورة واضحة لبطاقة الرقم القومي من الأمام',
      required: true,
    },
    {
      id: 'doc-id-back',
      label: 'صورة البطاقة الشخصية (الوجه الخلفي)',
      description: 'صورة واضحة لظهر بطاقة الرقم القومي',
      required: true,
    },
    {
      id: 'doc-activity-proof',
      label: 'إثبات النشاط (حيازة زراعية / عقد إيجار / سجل تجاري)',
      description: 'بطاقة حيازة أو عقد أرض للمزارع، أو سجل تجاري للتجار والموزعين',
      required: true,
    },
    {
      id: 'doc-extra',
      label: 'مستند أو صورة إضافية (اختياري)',
      description: 'مثال: صورة المزرعة / المحل أو أي أوراق داعمة',
      required: false,
    },
  ],
  customQuestions: [
    {
      id: 'q-prev-deal',
      label: 'هل سبق لك التعامل مع شركة كروپسا أو طلب تمويل زراعي من قبل؟',
      placeholder: 'مثال: أول مرة / تعاملت سابقاً في موسم الصيف...',
      required: false,
    },
  ],
};

export function resolveIslamicFinancingConfig(settings?: CatalogSettings): IslamicFinancingConfig {
  const custom = settings?.islamicFinancingConfig;
  if (!custom) {
    return DEFAULT_ISLAMIC_FINANCING_CONFIG;
  }
  return {
    headline: custom.headline?.trim() || DEFAULT_ISLAMIC_FINANCING_CONFIG.headline,
    subheadline: custom.subheadline?.trim() || DEFAULT_ISLAMIC_FINANCING_CONFIG.subheadline,
    faqs:
      Array.isArray(custom.faqs) && custom.faqs.length > 0
        ? custom.faqs
        : DEFAULT_ISLAMIC_FINANCING_CONFIG.faqs,
    requiredDocs:
      Array.isArray(custom.requiredDocs) && custom.requiredDocs.length > 0
        ? custom.requiredDocs
        : DEFAULT_ISLAMIC_FINANCING_CONFIG.requiredDocs,
    customQuestions: Array.isArray(custom.customQuestions)
      ? custom.customQuestions
      : DEFAULT_ISLAMIC_FINANCING_CONFIG.customQuestions,
  };
}
