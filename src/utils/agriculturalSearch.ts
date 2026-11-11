import { Product } from '../types';

/**
 * Normalizes Arabic & Latin text for forgiving catalog search:
 * unifies Alef forms (أ إ آ -> ا), Teh Marbuta (ة -> ه), Alef Maksura (ى -> ي),
 * strips diacritics, and lowercases Latin letters.
 */
export function normalizeArabicSearch(input: string): string {
  return String(input || '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

interface AgronomyTagRule {
  patterns: string[];
  tags: string[];
}

const AGRONOMY_TAG_RULES: AgronomyTagRule[] = [
  {
    patterns: [
      'دود', 'ديدان', 'يرق', 'حشر', 'ثاقب', 'حرشفي', 'لمبادا', 'لامبادا', 'lambda',
      'سايهالوثرين', 'cyhalothrin', 'ديلتامثرين', 'deltamethrin', 'ايمامكتين', 'emamectin',
      'كلوربيريفوس', 'chlorpyrifos', 'فينيتروثيون', 'اندوكساكارب', 'لوفينورون', 'سبينوساد',
      'ابامكتين', 'abamectin', 'اسيتامبريد', 'acetamiprid', 'اميداكلوبريد', 'imidacloprid',
      'ثياميثوكسام', 'دلتا', 'ميثوميل', 'ملامسه', 'معدي',
    ],
    tags: [
      'دودة', 'ديدان', 'يرقات', 'حشرات', 'مبيد حشري', 'توتا أبسلوتا',
      'ذبابة بيضاء', 'من', 'تربس', 'ثاقبات', 'طماطم', 'بطاطس', 'خضر', 'قطن', 'ذرة',
    ],
  },
  {
    patterns: [
      'توتا', 'tuta', 'صانعات انفاق', 'حفار', 'ورق القطن', 'قارضة', 'دودة الثمار',
    ],
    tags: ['دودة', 'توتا أبسلوتا', 'طماطم', 'بطاطس', 'حشرات'],
  },
  {
    patterns: [
      'ذبابه', 'ذبابة بيضاء', 'تربس', 'جاسيد', 'من ', 'البق الدقيقي', 'حشرات ماصه', 'ثاقبه ماصه',
    ],
    tags: ['حشرات', 'ذبابة بيضاء', 'من', 'تربس', 'طماطم', 'خيار', 'فلفل'],
  },
  {
    patterns: [
      'اكاروس', 'عنكبوت', 'ميتس', 'ابامكتين', 'abamectin', 'سبيرودكلوفين', 'بايفينازيت', 'هيكسيثيازوكس',
    ],
    tags: ['أكاروس', 'عنكبوت أحمر', 'حشرات', 'فراولة', 'موالح', 'تفاح'],
  },
  {
    patterns: [
      'نيماتود', 'nematod', 'اوكساميل', 'فوسثايزيت', 'تعقد جذور',
    ],
    tags: ['نيماتودا', 'أعفان', 'جذور', 'طماطم', 'بطاطس', 'موز'],
  },
  {
    patterns: [
      'عفن', 'اعفان', 'فطر', 'بياض', 'ندوه', 'ندوة', 'لفحه', 'تبقع', 'ذبول', 'فيوزاريوم',
      'ازوكسي', 'azoxystrobin', 'ديفينوكونازول', 'مانكوزيب', 'mancozeb', 'ميتالاكسيل', 'metalaxyl',
      'فوسفيت', 'فوسفايت', 'نحاس', 'كابتان', 'تيبوكونازول', 'كاربندازيم', 'كبريت ميكروني',
      'سيموكسانيل', 'بوسكاليد', 'هيومكس', 'ثيوفانات',
    ],
    tags: [
      'أعفان', 'عفن', 'فطريات', 'مبيد فطري', 'بياض دقيقي', 'بياض زغبي',
      'ندوة متأخرة', 'ندوة مبكرة', 'لفحة', 'عفن جذور', 'طماطم', 'بطاطس', 'عنب',
    ],
  },
  {
    patterns: [
      'حشائش', 'عشب', 'جليفوسات', 'glyphosate', 'بنديميثالين', 'pendimethalin',
      '2,4-d', 'ميتريبوزين', 'اترازين', 'هالوكسيفوب', 'كليثوديم', 'ابادة الحشائش', 'حشيشه',
    ],
    tags: ['حشائش', 'مبيد حشائش', 'رفيعة الأوراق', 'عريضة الأوراق', 'قمح', 'ذرة', 'بصل'],
  },
  {
    patterns: [
      'هيوميك', 'humic', 'هيومات', 'فولفيك', 'fulvic', 'احماض عضويه', 'مخصب تربه',
    ],
    tags: ['هيوميك', 'هيومات بوتاسيوم', 'تجذير', 'جذور', 'معالج ملوحة', 'تربة'],
  },
  {
    patterns: [
      'تجذير', 'جذور', 'شعيرات جذريه', 'فسفور', 'فوسفور', 'p2o5', 'اندول', 'iba', 'naa',
      'تشتيل', 'بداية النمو', 'انبات',
    ],
    tags: ['تجذير', 'جذور', 'تنشيط جذور', 'تشتيل', 'شتلات'],
  },
  {
    patterns: [
      'تحجيم', 'حجم الثمار', 'تلوين', 'سكريات', 'نضج', 'تزهير', 'عقد', 'ثبات العقد',
      'بوتاسيوم', 'k2o', 'سترات بوتاسيوم', 'نترات بوتاسيوم', 'طحالب', 'سيتوكينين', 'بورون', 'كالسيوم',
    ],
    tags: ['تحجيم', 'تزهير', 'عقد ثمار', 'تلوين', 'بوتاسيوم', 'طماطم', 'بطاطس', 'عنب', 'موالح', 'فاكهة'],
  },
  {
    patterns: [
      'ملوحه', 'صوديوم', 'كلوريد', 'طارد للملوحه', 'جير', 'كالسيوم سائل',
    ],
    tags: ['ملوحة', 'معالج ملوحة', 'جذور', 'استصلاح'],
  },
  {
    patterns: ['طماطم', 'خضر'],
    tags: ['طماطم', 'خضروات'],
  },
  {
    patterns: ['بطاطس', 'درنات'],
    tags: ['بطاطس', 'درنات'],
  },
];

const QUICK_SEARCH_SYNONYM_GROUPS: Array<{ triggers: string[]; expand: string[] }> = [
  {
    triggers: ['دوده', 'دود', 'ديدان', 'يرقه', 'يرقات', 'حشره', 'حشرات', 'حشري', 'توتا'],
    expand: ['دوده', 'دود', 'ديدان', 'يرق', 'حشر', 'توتا', 'ذبابه', 'ثاقب', 'لمبادا', 'حرشف'],
  },
  {
    triggers: ['عفن', 'اعفان', 'فطر', 'فطري', 'فطريات', 'بياض', 'ندوه', 'لفحه'],
    expand: ['عفن', 'اعفان', 'فطر', 'بياض', 'ندوه', 'لفحه', 'تبقع', 'ذبول', 'جذور'],
  },
  {
    triggers: ['تجذير', 'جذر', 'جذور'],
    expand: ['تجذير', 'جذر', 'جذور', 'فوسفور', 'فسفور', 'هيوميك', 'تشتيل'],
  },
  {
    triggers: ['تحجيم', 'تزهير', 'عقد', 'تلوين'],
    expand: ['تحجيم', 'تزهير', 'عقد', 'تلوين', 'ثمار', 'بوتاسيوم', 'حجم', 'نضج'],
  },
  {
    triggers: ['هيوميك', 'هيومات', 'فولفيك'],
    expand: ['هيوميك', 'هيومات', 'فولفيك', 'humic'],
  },
  {
    triggers: ['طماطم', 'بطاطس'],
    expand: ['طماطم', 'بطاطس', 'خضر', 'خضروات'],
  },
];

/**
 * Infers hidden agronomy search tags from product name, composition, description, and usage
 * so existing & newly imported items respond cleanly to farmer pest/crop quick-search queries.
 */
export function inferAgronomySearchTags(product: {
  name?: string;
  shortDescription?: string;
  description?: string;
  characteristics?: string[];
  composition?: string[];
  usage?: string[];
  categoryName?: string;
  productType?: string;
  searchTags?: string[];
}): string[] {
  const combined = normalizeArabicSearch(
    [
      product.name || '',
      product.shortDescription || '',
      product.description || '',
      (product.characteristics || []).join(' '),
      (product.composition || []).join(' '),
      (product.usage || []).join(' '),
      product.categoryName || '',
    ].join(' ')
  );

  const tagSet = new Set<string>(
    (product.searchTags || []).map((t) => String(t || '').trim()).filter(Boolean)
  );

  for (const rule of AGRONOMY_TAG_RULES) {
    if (rule.patterns.some((pat) => combined.includes(normalizeArabicSearch(pat)))) {
      for (const tag of rule.tags) {
        tagSet.add(tag);
      }
    }
  }

  return Array.from(tagSet).slice(0, 28);
}

/**
 * Evaluates whether a product matches a user search query across all technical specs,
 * usage instructions, explicit AI searchTags, and inferred agronomy keywords.
 */
export function matchesProductSearch(
  product: Product,
  rawQuery: string,
  extra?: { categoryName?: string; companyName?: string }
): boolean {
  const q = normalizeArabicSearch(rawQuery);
  if (!q) return true;

  const inferredTags = inferAgronomySearchTags({
    ...product,
    categoryName: extra?.categoryName,
  });

  const searchableCorpus = normalizeArabicSearch(
    [
      product.id,
      product.name,
      product.shortDescription,
      product.description || '',
      (product.characteristics || []).join(' '),
      (product.composition || []).join(' '),
      (product.usage || []).join(' '),
      product.applicationRate || '',
      (product.searchTags || []).join(' '),
      inferredTags.join(' '),
      extra?.categoryName || '',
      extra?.companyName || '',
    ].join(' ')
  );

  if (searchableCorpus.includes(q)) return true;

  // Check synonym group expansion for common quick-search tags & multi-word queries
  const terms = q.split(' ').filter(Boolean);
  return terms.every((term) => {
    if (searchableCorpus.includes(term)) return true;
    for (const group of QUICK_SEARCH_SYNONYM_GROUPS) {
      const normalizedTriggers = group.triggers.map(normalizeArabicSearch);
      if (normalizedTriggers.some((tr) => tr === term || tr.includes(term) || term.includes(tr))) {
        if (group.expand.some((syn) => searchableCorpus.includes(normalizeArabicSearch(syn)))) {
          return true;
        }
      }
    }
    return false;
  });
}
