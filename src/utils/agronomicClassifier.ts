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

  // Resolve standard main categories dynamically
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

    // Comprehensive text extraction (avoiding searchTags to prevent contamination from automated generic tags)
    const fullText = [
      product.name || '',
      product.shortDescription || '',
      product.description || '',
      (product.characteristics || []).join(' '),
      (product.composition || []).join(' '),
      (product.usage || []).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // 1. Diagnostic Indicators
    const isFungicide =
      /مبيد فطري|مبيدات فطرية|فطرية وقائية|فطرية علاجية|بياض دقيقي|بياض زغبي|أعفان ثمار|عفن رمادي|أعفان جذور|صدأ|أصداء|تبقع أوراق|ندوة مبكرة|ندوة متأخرة|لفحة|جرب|فيوزاريوم|بيثيوم|ريزوكتونيا|بوتريتس|مانكوزيب|ميتالاكسيل|أزوكسيستروبين|دايفينوكونازول|ثيرام|كربندازيم|كبريت ميكروني|هيدروكسيد نحاس|أكسيكلورور|كبريتات نحاس|جلوكونات نحاس|فوستيل ألومنيوم|دايمثومورف/i.test(
        fullText
      );

    const isInsecticide =
      /مبيد حشري|مبيدات حشرية|مبيد أكاروسي|مبيد عناكبي|دودة ورق|ديدان ثمار|ثاقبات|ذبابة بيضاء|ذبابة الفاكهة|تربس|(?:المن\b|حشرة المن)|توتا أبسلوتا|خنافس|سوسة النخيل|أكاروس|عنكبوت أحمر|عناكب|صانعات أنفاق|جاسيد|نطاط|إمامكتين|كلوربيريفوس|أبامكتين|لامبدا|ثياميثوكسام|إميداكلوبريد|ألفاسايبرمثرين|دلتا مثرين|أسيتامبريد|إندوكساكارب/i.test(
        fullText
      );

    const isHerbicide =
      /مبيد حشائش|مبيدات حشائش|مكافحة الحشائش|حشائش عريضة|حشائش رفيعة|هالوك|حامول|نجيل|جلايفوسات|أوكسي فلورفين|بروباموكارب|تراي بيورين|متربيوزين/i.test(
        fullText
      );

    const isNematicide =
      /مبيد نيماتود|مبيدات نيماتود|مبيد نيماتودي|نيماتود|تعقد الجذور|ديدان ثعبانية|أوكساميل|فيودان|فوستيزات|فينا ميفوس|فلوينسلفون/i.test(
        fullText
      );

    const isCompoundFert =
      /\bnpk\b|\bpk\b|بي\s*كيه|بي\s*كي|فوسفور\s*وبوتاسيوم|بوتاسيوم\s*وفوسفور|فسفور\s*وبوتاسيوم|\b\d{1,2}[-\/]\d{1,2}[-\/]\d{1,2}\b|سماد مركب|أسمدة مركبة|سماد متوازن|تسميد متوازن|سماد بودر|سماد كريستال|عالي الفوسفور|عالي الفسفور|عالي البوتاسيوم|عالي النيتروجين/i.test(
        fullText
      );

    const isSingleFert =
      /سماد أحادي|أسمدة أحادية|احادي|أحادي|سوبر فوسفات|سلفات نشادر|يوريا|نترات كالسيوم|سلفات بوتاسيوم|سلفات ماغنسيوم|نترات نشادر|حديد مخلبي|زنك مخلبي|منجنيز مخلبي|بورون|عناصر صغرى/i.test(
        fullText
      );

    const isBiostimulant =
      /مخصب|مخصبات|محفز|محفزات|أحماض أمينية|طحالب بحرية|مستخلص طحالب|مستخلص بحري|سيتوكينين|أوكسين|جبرلين|هيوميك|فولفيك|منشط جذور|مخصب ورقي|مخصبات ورقية|مخصب حيوي|منشط نمو/i.test(
        fullText
      );

    const pesticideCluesCount = [isFungicide, isInsecticide, isHerbicide, isNematicide].filter(
      Boolean
    ).length;

    let suggestedCatId = product.categoryId;
    let suggestedSubId = product.subCategoryId || '';
    let suggestedSubName = '';
    const detected: string[] = [];
    let reason = '';

    // A. Pesticides Category & Subcategory Analysis
    if (
      pesticideCluesCount > 0 &&
      !fullText.includes('سماد') &&
      !fullText.includes('أسمدة') &&
      !isCompoundFert
    ) {
      if (pesticideCat) suggestedCatId = pesticideCat.id;

      if (isFungicide && !isInsecticide && !isHerbicide) {
        if (subFungicide) {
          suggestedSubId = subFungicide.id;
          suggestedSubName = subFungicide.name;
        }
        detected.push('مكافحة فطريات', 'أعفان / بياض / لفحة');
        reason = 'مركب وقائي/علاجي لمكافحة الفطريات وأمراض المجموع الخضري والجذري';
      } else if (isInsecticide && !isFungicide && !isHerbicide) {
        if (subInsecticide) {
          suggestedSubId = subInsecticide.id;
          suggestedSubName = subInsecticide.name;
        }
        detected.push('مكافحة حشرات', 'ديدان / ثواقب / عناكب');
        reason = 'مبيد حشري لمكافحة الآفات الحشرية والديدان والأكاروسات';
      } else if (isHerbicide) {
        if (subHerbicide) {
          suggestedSubId = subHerbicide.id;
          suggestedSubName = subHerbicide.name;
        }
        detected.push('إبادة حشائش', 'عريضة / رفيعة / نجيل');
        reason = 'مبيد حشائش متخصص لاختيار ومكافحة الحشائش الحولية والمعمرة';
      } else if (isNematicide) {
        if (subNematicide) {
          suggestedSubId = subNematicide.id;
          suggestedSubName = subNematicide.name;
        }
        detected.push('مكافحة نيماتودا', 'تعقد الجذور');
        reason = 'مركب نيماتودي لمكافحة الديدان الثعبانية وحماية الشعيرات الجذرية';
      }
    }
    // If already in Pesticides, refine subcategory
    else if (pesticideCat && product.categoryId === pesticideCat.id && pesticideCluesCount > 0) {
      suggestedCatId = pesticideCat.id;
      if (isFungicide && !isInsecticide && !isHerbicide) {
        if (subFungicide) {
          suggestedSubId = subFungicide.id;
          suggestedSubName = subFungicide.name;
        }
        detected.push('مبيد فطري');
        reason = 'مركب فطري مسجل ضمن المبيدات';
      } else if (isInsecticide && !isFungicide && !isHerbicide) {
        if (subInsecticide) {
          suggestedSubId = subInsecticide.id;
          suggestedSubName = subInsecticide.name;
        }
        detected.push('مبيد حشري / عناكب');
        reason = 'مركب حشري أو عناكبي مسجل ضمن المبيدات';
      } else if (isHerbicide) {
        if (subHerbicide) {
          suggestedSubId = subHerbicide.id;
          suggestedSubName = subHerbicide.name;
        }
        detected.push('مبيد حشائش');
        reason = 'مبيد حشائش مسجل ضمن المبيدات';
      } else if (isNematicide) {
        if (subNematicide) {
          suggestedSubId = subNematicide.id;
          suggestedSubName = subNematicide.name;
        }
        detected.push('مبيد نيماتودا');
        reason = 'مبيد نيماتودي متخصص';
      }
    }
    // B. Fertilizers Category & Subcategory Analysis
    else if (isCompoundFert || isSingleFert) {
      if (fertCat) suggestedCatId = fertCat.id;

      if (isCompoundFert) {
        if (subCompoundFert) {
          suggestedSubId = subCompoundFert.id;
          suggestedSubName = subCompoundFert.name;
        }
        detected.push('سماد NPK', 'تسميد متوازن');
        reason = 'سماد يحتوي على عناصر كبرى (نيتروجين - فوسفور - بوتاسيوم)';
      } else if (isSingleFert) {
        if (subSingleFert) {
          suggestedSubId = subSingleFert.id;
          suggestedSubName = subSingleFert.name;
        }
        detected.push('سماد أحادي', 'عناصر صغرى مخلبية');
        reason = 'سماد أحادي أو مغذيات صغرى مخلبية لتعويض نقص العناصر';
      }
    }
    // C. Biostimulants & Foliar Category Analysis
    else if (isBiostimulant) {
      if (stimCat) suggestedCatId = stimCat.id;
      detected.push('مخصب حيوي', 'أحماض أمينية / طحالب');
      reason = 'محفز نمو ورقي وتنشيط مناعي للتحجيم والتزهير ومقاومة الإجهاد';

      // Check for company specific stimulant subcategories
      const compSubs = subCategories.filter(
        (s) => s.companyId === product.companyId && s.active !== false
      );
      const matchSub = compSubs.find((s) => /مخصب|أحماض|ورق|سائل/i.test(s.name));
      if (matchSub) {
        suggestedSubId = matchSub.id;
        suggestedSubName = matchSub.name;
      }
    }

    // Resolve human-readable subcategory name if ID is assigned
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
      });
    }
  }

  return proposals;
}
