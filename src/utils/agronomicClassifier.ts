import { Product, Category, CompanySubCategory, Company } from '../types';
import {
  getMainCategories,
  getUnifiedSubCategoriesForSelection,
  getUnifiedSubCategoryName,
} from './categoryHierarchy';

export interface AgronomicClassificationProposal {
  product: Product;
  companyName: string;
  // Current classification
  currentCategoryId: string;
  currentCategoryName: string;
  currentSubCategoryId?: string;
  currentSubCategoryName: string;
  // Suggested classification
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  suggestedSubCategoryId: string;
  suggestedSubCategoryName: string;
  // Analysis & Flags
  isCategoryChanged: boolean;
  isSubCategoryChanged: boolean;
  detectedKeywords: string[];
  reason: string;
  confidence: 'high' | 'medium';
  selected: boolean;
  source?: 'rule_engine' | 'ai_deep_research';
}

/**
 * Analyzes products across the catalog using specialized agronomic domain intelligence.
 * Evaluates active ingredient, target diseases/pests, crop usage, and chemical composition
 * to suggest both the correct Main Category (مبيدات / أسمدة / مخصبات) and the appropriate Subcategory.
 *
 * CRITICAL SAFETY INVARIANT:
 * NEVER alters companyId or manufacturer under any circumstances!
 * Only proposes updates to categoryId and subCategoryId.
 */
export function analyzeProductsForAgronomicSubCategories(
  products: Product[],
  categories: Category[],
  subCategories: CompanySubCategory[],
  companies: Company[]
): AgronomicClassificationProposal[] {
  const compMap = new Map(companies.map((c) => [c.id, c.name]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  // Standard main categories
  const pesticideCat = categories.find((c) => !c.parentId && c.name.includes('مبيد'));
  const fertCat = categories.find(
    (c) => !c.parentId && (c.name.includes('أسمدة') || c.name.includes('سماد'))
  );
  const stimCat = categories.find((c) => !c.parentId && c.name.includes('مخصب'));

  // Standard subcategories
  const subFungicide = categories.find((c) => c.name.includes('فطر'));
  const subInsecticide = categories.find((c) => c.name.includes('حشر'));
  const subHerbicide = categories.find((c) => c.name.includes('حشائش'));
  const subNematicide = categories.find((c) => c.name.includes('نيماتود'));
  const subCompoundFert = categories.find((c) => c.name.includes('مركب'));
  const subSingleFert = categories.find(
    (c) => c.name.includes('احادي') || c.name.includes('أحادي')
  );

  const proposals: AgronomicClassificationProposal[] = [];

  for (const product of products) {
    const companyName = compMap.get(product.companyId) || 'شركة زراعية';

    // 1. Primary technical data (Highest confidence: name, composition, short description)
    const primaryText = [
      product.name || '',
      product.shortDescription || '',
      (product.composition || []).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // 2. Secondary narrative data (Descriptions, Characteristics & Usage)
    const secondaryText = [
      product.description || '',
      (product.characteristics || []).join(' '),
      (product.usage || []).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Clean out false-positive phrases before matching
    // e.g. "غير مخصب" (unfertilized insect eggs) must not trigger biostimulants!
    // e.g. "مقاومة الحشرات" or "مقاومة النيماتودا" as a secondary stress claim in algae/stimulants
    const cleanPrimary = primaryText.replace(/غير\s*مخصب/g, '');
    const cleanSecondary = secondaryText
      .replace(/غير\s*مخصب/g, '')
      .replace(/مقاومة\s+(?:الحشرات|الفطريات|النيماتودا)/g, 'تحمل_اجهاد')
      .replace(/تحمل\s+(?:الإصابة|الاصابة)\s+بالنيماتودا/g, 'تحمل_اجهاد')
      .replace(/علاج\s+(?:نقص\s+العناصر|الاصفرار|القلب\s+الاجوف|الطرف\s+الزهري)/g, 'تغذية_نبات');
    const cleanFull = `${cleanPrimary} ${cleanSecondary}`;

    // --- DETECTION MATRICES ---

    // A. PESTICIDES (Insecticides, Fungicides, Herbicides, Nematicides)
    const isInsecticideExplicit =
      /مبيد\s+حشري|مبيدات\s+حشرية|مبيد\s+أكاروسي|مبيد\s+اكاروسي|مبيد\s+عناكبي|حشري\s+عناكبي|لمبادا|لامبدا|كفروكسام|ثياميثوكسام|لوفينورون|إمامكتين|امامكتين|أبامكتين|ابامكتين|كلوربيريفوس|ألفاسايبرمثرين|الفاسايبرمثرين|دلتا\s*مثرين|دلتامثرين|أسيتامبريد|اسيتامبريد|إندوكساكارب|اندوكساكارب|بايريدابين|تيتراكلورانيل|كلورانترانيليبرول|دايمثوات|مالاثيون|زيت\s+(?:صيفي|معدني|شتوي)|كزد\s*اويل|بست\b|دايفر\b/i.test(
        cleanFull
      );
    const hasInsectTarget =
      /(?:مكافحة|إبادة|رش|علاج)\s+(?:الديدان|ديدان|الحشرات|المن\b|التربس|العناكب|الأكاروس|الأكاروسات|الذبابة\s+البيضاء|توتا\s*أبسلوتا|توتا\s*ابسلوتا|سوسة|صانعات\s+أنفاق|الخنافس|الجاسيد)/i.test(
        cleanFull
      ) ||
      /\b(?:توتا\s*أبسلوتا|توتا\s*ابسليوتا|ديدان\s+الثمار|دودة\s+ورق|ديدان\s+الأنفاق)\b/i.test(
        cleanFull
      );
    const isInsecticide =
      isInsecticideExplicit ||
      (hasInsectTarget && !cleanPrimary.includes('سماد') && !cleanPrimary.includes('طحالب'));

    // Fungicides
    const isFungicideExplicit =
      /مبيد\s+فطري|مبيدات\s+فطرية|فطرية\s+وقائية|فطرية\s+علاجية|زوكسی\s*مورف|اسباركلينز|جولو\s*كوبر|دايميثومورف|دايمثومورف|أزوكسيستروبين|ازوكسيستروبين|بيراكلوستروبين|بوسكاليد|كلوروثالونيل|دايفينوكونازول|بروبيكونازول|هيبمكسازول|ميتالاكسيل|ميفينوكسام|مانكوزيب|فوستيل|فوستيل\s*ألومنيوم|ثيوفنات|كاربندازيم|كربندازيم|سيموكسانيل|كبريت\s+ميكروني|كبريت\s+تعفير|كبريت\s+(?:70|80)٪?%?|جلوكونات\s+نحاس|أكسي\s*كلورور|اكسي\s*كلورور|هيدروكسيد\s+نحاس|كبريتات\s+نحاس|فلوديوكسونيل|ترايديمينول|بيفيناكيت|بروكلوراز/i.test(
        cleanFull
      );
    const hasFungalTarget =
      /(?:مكافحة|علاج|وقاية\s+من)\s+(?:البياض\s+الدقيقي|البياض\s+الزغبي|أعفان\s+الجذور|عفن\s+الرقبة|أعفان\s+الثمار|الندوة\s+المبكرة|الندوة\s+المتأخرة|اللفحة|الصدأ|أصداء|تبقع\s+الأوراق|فيوزاريوم|بيثيوم|ريزوكتونيا|سكليروتينيا|بوتريتس)/i.test(
        cleanFull
      );
    const isFungicide =
      isFungicideExplicit ||
      (hasFungalTarget && !cleanPrimary.includes('سماد') && !cleanPrimary.includes('طحالب'));

    // Herbicides
    const isHerbicide =
      /مبيد\s+حشائش|مبيدات\s+حشائش|مكافحة\s+الحشائش|حشائش\s+(?:عريضة|رفيعة|حولية|معمرة)|مانع\s+(?:إنبات|انبات|انبثاق)|أوكسي\s*فلورفين|اوكسي\s*فلورفين|بروموكسينيل|بينوكسادين|كلودينافوب|جلايفوسات|بيرازوسلفورون|أوكساديازون|اوكساديازون|بروبيزاميد|متربيوزين|تراي\s*بيورين|هالوك|حامول/i.test(
        cleanFull
      );

    // Nematicides
    const isNematicide =
      /مبيد\s+نيماتود|مبيدات\s+نيماتود|مبيد\s+نيماتودي|نيماسكيل|كيلر\b|ستار\s*ليكس|أوكساميل|اوكساميل|فيودان|فوستيزات|كاس\s*تيم|فلوينسلفون|مكافحة\s+نيماتودا|نيماتودا\s+تعقد\s+الجذور|ديدان\s+ثعبانية/i.test(
        cleanFull
      );

    // B. FERTILIZERS (Compound NPK or Single Micronutrients)
    const isCompoundFert =
      /\bnpk\b|\bpk\b|بي\s*كيه|بي\s*كي|فوسفور\s*وبوتاسيوم|بوتاسيوم\s*وفوسفور|فسفور\s*وبوتاسيوم|\b\d{1,2}[-\/]\d{1,2}[-\/]\d{1,2}\b|سماد\s+مركب|أسمدة\s+مركبة|سماد\s+متوازن|تسميد\s+متوازن|سترات\s+بوتاسيوم|سول\s+نوفا\s+فارم|فاستر\b|كنز\s*بلس|الوكا\b|سوبريم\s*pk|ماغنوكالسيوم|كالسيوم\s*و?ماغنسيوم|نيتروجين\s*وفوسفور\s*وبوتاسيوم|عالي\s+(?:البوتاسيوم|الفوسفور|الفسفور|النيتروجين)/i.test(
        cleanFull
      );

    const isSingleFert =
      /سماد\s+أحادي|سماد\s+احادي|أسمدة\s+أحادية|نترات\s+(?:كالسيوم|نشادر|بوتاسيوم|ماغنسيوم)|سلفات\s+(?:بوتاسيوم|ماغنسيوم|نشادر|زنك|حديد|منجنيز)|كبريتات\s+(?:ماغنسيوم|بوتاسيوم|حديد|زنك|منجنيز)|يوريا|سوبر\s+فوسفات|حديد\s+(?:مخلبي|13%|eddha|edta)|زنك\s+(?:مخلبي|13%|edta)|منجنيز\s+(?:مخلبي|13%|edta)|بورون\s+(?:17%|14%|11%|20%)|مخلبي|مخلبيات|عناصر\s+صغرى\s+(?:مخلبية|مفردة|بودر)|كروب\s*جرين|اوركال|باريتو|ايزو\s*ماكس|كالفيرت|شتيل|بيج\s+كالسيوم|بيج\s+ستروج/i.test(
        cleanFull
      );

    // C. BIOSTIMULANTS & HORMONES & SEAWEED & AMINO ACIDS
    const isBiostimulant =
      /مخصب|مخصبات|مستخلص\s+طحالب|طحالب\s+بحرية|طحالب|أحماض\s+أمينية|احماض\s+امينية|أمينو|امينو|هيوميك|فولفيك|سيتوكينين|سيتوكينينات|أوكسين|اوكسينات|جبرلين|جبريلين|الجبرليك|محفز\s+نمو|محفزات\s+نمو|منشط\s+جذور|منشط\s+نمو|منشط\s+للمجموع\s+الجدري|معالج\s+ملوحة|معالجة\s+الملوحة|مقاومة\s+الملوحة|رافع\s+إجهاد|رافع\s+اجهاد|مضاد\s+إجهاد|مضاد\s+اجهاد|مقاومة\s+الإجهاد|مقاومة\s+الجهاد|تزهير\s+وعقد|عقد\s+وتزهير|تزهير\s+وتثبيت|تحجيم\s+الثمار|تلوين\s+الثمار|الجيفول|أبو\s*شنب|ستمبلكس|اكساديان|كاتاليست|هرمون\s+نباتي|نفثالين\s+أسيتك|naa\b|رووت\s*اون|نوفاندول|أجروتونك|اجروتونك|هيوماسول|كيورسال|اورسال/i.test(
        cleanFull
      );

    // Evaluate Category Candidates
    const isPesticideCandidate = isInsecticide || isFungicide || isHerbicide || isNematicide;
    const isStimulantCandidate =
      isBiostimulant &&
      !cleanPrimary.includes('مبيد') &&
      !cleanPrimary.includes('npk') &&
      !/\b\d{1,2}[-\/]\d{1,2}[-\/]\d{1,2}\b/.test(cleanPrimary);

    const isFertilizerCandidate =
      (isCompoundFert || isSingleFert) &&
      !cleanPrimary.includes('مبيد') &&
      !isStimulantCandidate;

    let suggestedCatId = product.categoryId;
    let suggestedSubId = product.subCategoryId || '';
    let suggestedSubName = '';
    const detected: string[] = [];
    let reason = '';

    // RULE 1: PESTICIDES PRIORITY (Active pesticide chemistry always takes precedence)
    if (
      isPesticideCandidate &&
      (!isStimulantCandidate || cleanPrimary.includes('مبيد') || isInsecticideExplicit || isFungicideExplicit)
    ) {
      if (pesticideCat) suggestedCatId = pesticideCat.id;

      if (isNematicide) {
        if (subNematicide) {
          suggestedSubId = subNematicide.id;
          suggestedSubName = subNematicide.name;
        }
        detected.push('مكافحة نيماتودا', 'ديدان ثعبانية / تعقد جذور');
        reason = 'مبيد نيماتودي متخصص لمكافحة نيماتودا تعقد الجذور';
      } else if (isHerbicide) {
        if (subHerbicide) {
          suggestedSubId = subHerbicide.id;
          suggestedSubName = subHerbicide.name;
        }
        detected.push('إبادة حشائش', 'مبيد حشائش متخصص');
        reason = 'مبيد حشائش متخصص لمكافحة الحشائش الحولية والمعمرة';
      } else if (isInsecticide && !isFungicideExplicit) {
        if (subInsecticide) {
          suggestedSubId = subInsecticide.id;
          suggestedSubName = subInsecticide.name;
        }
        detected.push('مبيد حشري / عناكب', 'مكافحة ديدان وثواقب');
        reason = 'مبيد حشري/أكاروسي لمكافحة الآفات الحشرية والديدان والعناكب';
      } else if (isFungicide) {
        if (subFungicide) {
          suggestedSubId = subFungicide.id;
          suggestedSubName = subFungicide.name;
        }
        detected.push('مبيد فطري', 'وقاية وعلاج فطري');
        reason = 'مركب فطري وقائي/علاجي لمكافحة أمراض البياض والأعفان والندوات';
      }
    }
    // RULE 2: FERTILIZERS (Compound NPK or Single Micronutrients)
    else if (isFertilizerCandidate) {
      if (fertCat) suggestedCatId = fertCat.id;

      if (isCompoundFert) {
        if (subCompoundFert) {
          suggestedSubId = subCompoundFert.id;
          suggestedSubName = subCompoundFert.name;
        }
        detected.push('سماد NPK / مركب', 'تسميد متوازن');
        reason = 'سماد يحتوي على عناصر كبرى (نيتروجين - فوسفور - بوتاسيوم) أو تركيبة مركبة';
      } else if (isSingleFert) {
        if (subSingleFert) {
          suggestedSubId = subSingleFert.id;
          suggestedSubName = subSingleFert.name;
        }
        detected.push('سماد أحادي', 'عناصر مخلبية / مفردة');
        reason = 'سماد أحادي أو مغذيات صغرى مخلبية متخصصة لتعويض نقص العناصر';
      }
    }
    // RULE 3: BIOSTIMULANTS & GROWTH PROMOTERS
    else if (isStimulantCandidate) {
      if (stimCat) suggestedCatId = stimCat.id;
      detected.push('مخصب حيوي', 'أحماض أمينية / طحالب / محفز نمو');
      reason = 'مخصب حيوي ومحفز نمو لدعم التزهير، العقد، ومقاومة الإجهاد البيئي';

      // Check if company has custom stimulant subcategory
      const compSubs = subCategories.filter(
        (s) => s.companyId === product.companyId && s.active !== false
      );
      const matchSub = compSubs.find((s) => /مخصب|أحماض|ورق|سائل/i.test(s.name));
      if (matchSub) {
        suggestedSubId = matchSub.id;
        suggestedSubName = matchSub.name;
      } else {
        // If moved to stimulants and existing subcategory belongs to fertilizer or pesticide, clear it
        suggestedSubId = '';
        suggestedSubName = '';
      }
    }

    // Ensure suggested subcategory belongs to the suggested main category
    if (suggestedSubId) {
      const subCatObj = categories.find((c) => c.id === suggestedSubId);
      if (subCatObj && subCatObj.parentId && subCatObj.parentId !== suggestedCatId) {
        suggestedSubId = '';
        suggestedSubName = '';
      }
    }

    if (suggestedSubId && !suggestedSubName) {
      suggestedSubName =
        getUnifiedSubCategoryName(suggestedSubId, categories, subCategories) || 'قسم فرعي';
    }

    const isCategoryChanged = suggestedCatId !== product.categoryId;
    const isSubCategoryChanged =
      Boolean(suggestedSubId) && suggestedSubId !== product.subCategoryId;

    // Propose update if EITHER Main Category OR Subcategory changes
    if (isCategoryChanged || isSubCategoryChanged) {
      const currentCatName = catMap.get(product.categoryId) || 'غير محدد';
      const suggestedCatName = catMap.get(suggestedCatId) || currentCatName;
      const currentSubName =
        getUnifiedSubCategoryName(product.subCategoryId, categories, subCategories) ||
        'غير محدد';

      proposals.push({
        product,
        companyName,
        currentCategoryId: product.categoryId,
        currentCategoryName: currentCatName,
        currentSubCategoryId: product.subCategoryId,
        currentSubCategoryName: currentSubName,
        suggestedCategoryId: suggestedCatId,
        suggestedCategoryName: suggestedCatName,
        suggestedSubCategoryId: suggestedSubId || product.subCategoryId || '',
        suggestedSubCategoryName: suggestedSubName || currentSubName,
        isCategoryChanged,
        isSubCategoryChanged,
        detectedKeywords: detected,
        reason:
          reason ||
          (isCategoryChanged
            ? 'تصحيح القسم الرئيسي بناءً على التحليل الزراعي'
            : 'تصحيح القسم الفرعي'),
        confidence: detected.length >= 2 || isCategoryChanged ? 'high' : 'medium',
        selected: true,
        source: 'rule_engine',
      });
    }
  }

  return proposals;
}

/**
 * Calls backend Gemini AI endpoint to perform deep agronomic and web classification for ambiguous or batch products.
 */
export async function classifyProductsWithAi(
  products: Product[],
  categories: Category[],
  subCategories: CompanySubCategory[],
  companies: Company[],
  customApiKey?: string
): Promise<AgronomicClassificationProposal[]> {
  const compMap = new Map(companies.map((c) => [c.id, c.name]));
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const pesticideCat = categories.find((c) => !c.parentId && c.name.includes('مبيد'));
  const fertCat = categories.find(
    (c) => !c.parentId && (c.name.includes('أسمدة') || c.name.includes('سماد'))
  );
  const stimCat = categories.find((c) => !c.parentId && c.name.includes('مخصب'));

  const subFungicide = categories.find((c) => c.name.includes('فطر'));
  const subInsecticide = categories.find((c) => c.name.includes('حشر'));
  const subHerbicide = categories.find((c) => c.name.includes('حشائش'));
  const subNematicide = categories.find((c) => c.name.includes('نيماتود'));
  const subCompoundFert = categories.find((c) => c.name.includes('مركب'));
  const subSingleFert = categories.find(
    (c) => c.name.includes('احادي') || c.name.includes('أحادي')
  );

  const payload = products.map((p) => ({
    id: p.id,
    name: p.name,
    companyName: compMap.get(p.companyId) || '',
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    characteristics: p.characteristics || [],
    composition: p.composition || [],
    usage: p.usage || [],
    currentCategoryName: catMap.get(p.categoryId) || '',
    currentSubCategoryName:
      getUnifiedSubCategoryName(p.subCategoryId, categories, subCategories) || '',
  }));

  const res = await fetch('/api/gemini/classify-products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      products: payload,
      customApiKey: customApiKey || undefined,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `فشل الفحص بالذكاء الاصطناعي (رمز ${res.status})`);
  }

  const result = await res.json();
  const classifications: any[] = result.classifications || [];
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const proposals: AgronomicClassificationProposal[] = [];

  for (const item of classifications) {
    const product = prodMap.get(item.id);
    if (!product) continue;

    const companyName = compMap.get(product.companyId) || 'شركة زراعية';
    let suggestedCatId = product.categoryId;
    let suggestedSubId = product.subCategoryId || '';
    let suggestedSubName = '';

    if (item.categoryType === 'pesticides') {
      if (pesticideCat) suggestedCatId = pesticideCat.id;
      const subName = item.subCategoryName || '';
      if (subName.includes('فطر') && subFungicide) {
        suggestedSubId = subFungicide.id;
        suggestedSubName = subFungicide.name;
      } else if (subName.includes('حشر') && subInsecticide) {
        suggestedSubId = subInsecticide.id;
        suggestedSubName = subInsecticide.name;
      } else if (subName.includes('حشائش') && subHerbicide) {
        suggestedSubId = subHerbicide.id;
        suggestedSubName = subHerbicide.name;
      } else if (subName.includes('نيماتود') && subNematicide) {
        suggestedSubId = subNematicide.id;
        suggestedSubName = subNematicide.name;
      }
    } else if (item.categoryType === 'fertilizers') {
      if (fertCat) suggestedCatId = fertCat.id;
      const subName = item.subCategoryName || '';
      if (subName.includes('مركب') && subCompoundFert) {
        suggestedSubId = subCompoundFert.id;
        suggestedSubName = subCompoundFert.name;
      } else if ((subName.includes('احادي') || subName.includes('أحادي')) && subSingleFert) {
        suggestedSubId = subSingleFert.id;
        suggestedSubName = subSingleFert.name;
      }
    } else if (item.categoryType === 'stimulants') {
      if (stimCat) suggestedCatId = stimCat.id;
      const compSubs = subCategories.filter(
        (s) => s.companyId === product.companyId && s.active !== false
      );
      const matchSub = compSubs.find((s) => /مخصب|أحماض|ورق|سائل/i.test(s.name));
      if (matchSub) {
        suggestedSubId = matchSub.id;
        suggestedSubName = matchSub.name;
      } else {
        suggestedSubId = '';
        suggestedSubName = '';
      }
    }

    if (suggestedSubId && !suggestedSubName) {
      suggestedSubName =
        getUnifiedSubCategoryName(suggestedSubId, categories, subCategories) || 'قسم فرعي';
    }

    const currentCatName = catMap.get(product.categoryId) || 'غير محدد';
    const suggestedCatName = catMap.get(suggestedCatId) || currentCatName;
    const currentSubName =
      getUnifiedSubCategoryName(product.subCategoryId, categories, subCategories) || 'غير محدد';

    const isCategoryChanged = suggestedCatId !== product.categoryId;
    const isSubCategoryChanged =
      Boolean(suggestedSubId) && suggestedSubId !== product.subCategoryId;

    proposals.push({
      product,
      companyName,
      currentCategoryId: product.categoryId,
      currentCategoryName: currentCatName,
      currentSubCategoryId: product.subCategoryId,
      currentSubCategoryName: currentSubName,
      suggestedCategoryId: suggestedCatId,
      suggestedCategoryName: suggestedCatName,
      suggestedSubCategoryId: suggestedSubId || product.subCategoryId || '',
      suggestedSubCategoryName: suggestedSubName || currentSubName,
      isCategoryChanged,
      isSubCategoryChanged,
      detectedKeywords: [item.activeIngredient, item.subCategoryName].filter(Boolean),
      reason: item.reason || 'تصنيف بالذكاء الاصطناعي وبحث المركبات',
      confidence: item.confidence || 'high',
      selected: true,
      source: 'ai_deep_research',
    });
  }

  return proposals;
}

/**
 * Analyzes a single product to re-evaluate and propose its agronomic category and subcategory on demand.
 */
export function analyzeSingleProductAgronomic(
  product: Product,
  categories: Category[],
  subCategories: CompanySubCategory[],
  companies: Company[]
): AgronomicClassificationProposal {
  const result = analyzeProductsForAgronomicSubCategories(
    [product],
    categories,
    subCategories,
    companies
  );
  if (result.length > 0) return result[0];

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const compMap = new Map(companies.map((c) => [c.id, c.name]));
  const currentCatName = catMap.get(product.categoryId) || 'غير محدد';
  const currentSubName =
    getUnifiedSubCategoryName(product.subCategoryId, categories, subCategories) || 'غير محدد';

  return {
    product,
    companyName: compMap.get(product.companyId) || 'شركة زراعية',
    currentCategoryId: product.categoryId,
    currentCategoryName: currentCatName,
    currentSubCategoryId: product.subCategoryId,
    currentSubCategoryName: currentSubName,
    suggestedCategoryId: product.categoryId,
    suggestedCategoryName: currentCatName,
    suggestedSubCategoryId: product.subCategoryId || '',
    suggestedSubCategoryName: currentSubName,
    isCategoryChanged: false,
    isSubCategoryChanged: false,
    detectedKeywords: ['تحليل مطابق للقسم الحالي'],
    reason: 'المركب مصنف بالفعل بالقسم الملائم وفقاً للمكونات والخصائص الزراعية المسجلة',
    confidence: 'high',
    selected: true,
    source: 'rule_engine',
  };
}
