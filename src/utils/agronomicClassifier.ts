import { Product, Category, CompanySubCategory, Company } from '../types';
import { getUnifiedSubCategoriesForSelection, getUnifiedSubCategoryName } from './categoryHierarchy';

export interface AgronomicClassificationProposal {
  product: Product;
  companyName: string;
  currentSubCategoryId?: string;
  currentSubCategoryName: string;
  suggestedSubCategoryId: string;
  suggestedSubCategoryName: string;
  detectedKeywords: string[];
  reason: string;
  confidence: 'high' | 'medium';
  selected: boolean;
}

/**
 * Analyzes products across the catalog using agronomic domain intelligence.
 * Evaluates active ingredient, target diseases/pests, crop usage, and composition
 * to suggest the most accurate subcategory.
 *
 * CRITICAL SAFETY INVARIANT:
 * NEVER alters companyId or manufacturer under any circumstances!
 * Only proposes updates to subCategoryId.
 */
export function analyzeProductsForAgronomicSubCategories(
  products: Product[],
  categories: Category[],
  subCategories: CompanySubCategory[],
  companies: Company[]
): AgronomicClassificationProposal[] {
  const compMap = new Map(companies.map((c) => [c.id, c.name]));
  const proposals: AgronomicClassificationProposal[] = [];

  for (const product of products) {
    const companyName = compMap.get(product.companyId) || 'شركة زراعية';

    const fullText = [
      product.name || '',
      product.shortDescription || '',
      product.description || '',
      (product.characteristics || []).join(' '),
      (product.composition || []).join(' '),
      (product.usage || []).join(' '),
      (product.searchTags || []).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    // Available subcategory choices for this product:
    const availableOptions = getUnifiedSubCategoriesForSelection(
      categories,
      product.categoryId,
      product.companyId,
      subCategories
    );

    let suggestedSubId = '';
    let suggestedSubName = '';
    const detected: string[] = [];
    let reason = '';

    // 1. Fungicide (فطري / وقائي / علاجي)
    if (
      /فطر|بياض|أعفان|عفن|صدأ|تبقع|ندوة|لفحة|جرب|فيوزاريوم|بيثيوم|ريزوكتونيا|بوتريتس|أصداء|مانكوزيب|ميتالاكسيل|أزوكسيستروبين|دايفينوكونازول|ثيرام|كربندازيم|كبريت ميكروني|هيدروكسيد نحاس|أكسيكلورور/i.test(
        fullText
      )
    ) {
      const match = availableOptions.find((o) => o.name.includes('فطر'));
      if (match) {
        suggestedSubId = match.id;
        suggestedSubName = match.name;
        detected.push('مكافحة فطريات', 'أعفان / بياض / لفحة');
        reason = 'مركب ذو فاعلية ضد الفطريات والأعفان وأمراض المجموع الخضري والجذري';
      }
    }
    // 2. Insecticide & Acaricide (حشري / عناكب / ديدان)
    else if (
      /حشر|دودة|ديدان|ذبابة|تربس|من|توتا|خنافس|سوسة|أكاروس|عنكبوت|صانعات أنفاق|جاسيد|توتا أبسلوتا|حفار|نطاط|إمامكتين|كلوربيريفوس|أبامكتين|لامبدا|ثياميثوكسام|إميداكلوبريد|ألفاسايبرمثرين|دلتا مثرين/i.test(
        fullText
      )
    ) {
      const match = availableOptions.find(
        (o) => o.name.includes('حشر') || o.name.includes('أكاروس') || o.name.includes('عناكب')
      );
      if (match) {
        suggestedSubId = match.id;
        suggestedSubName = match.name;
        detected.push('مكافحة حشرات', 'ديدان / ثواقب / عناكب');
        reason = 'مركب متخصص في مكافحة الآفات الحشرية والديدان والذباب والعناكب';
      }
    }
    // 3. Herbicide (مبيدات حشائش)
    else if (
      /حشائش|حشيشة|عريضة|رفيعة|هالوك|حامول|نجيل|جلايفوسات|أوكسي فلورفين|بروباموكارب|تراي بيورين|متربيوزين/i.test(
        fullText
      )
    ) {
      const match = availableOptions.find((o) => o.name.includes('حشائش'));
      if (match) {
        suggestedSubId = match.id;
        suggestedSubName = match.name;
        detected.push('إبادة حشائش', 'عريضة / رفيعة / نجيل');
        reason = 'مبيد حشائش متخصص لاختيار ومكافحة الحشائش الحولية والمعمرة';
      }
    }
    // 4. Nematicide (مبيدات نيماتودا)
    else if (/نيماتود|عقد جذرية|ديدان ثعبانية|أوكساميل|فيودان|فوستيزات/i.test(fullText)) {
      const match = availableOptions.find((o) => o.name.includes('نيماتود'));
      if (match) {
        suggestedSubId = match.id;
        suggestedSubName = match.name;
        detected.push('مكافحة نيماتودا', 'تعقد الجذور');
        reason = 'مركب نيماتودي لمكافحة الديدان الثعبانية وحماية الشعيرات الجذرية';
      }
    }
    // 5. Compound Fertilizer / NPK (أسمدة مركبة)
    else if (
      /مركب|npk|متوازن|عالي الفوسفور|عالي البوتاسيوم|عالي النيتروجين|20-20-20|19-19-19|10-50-10|12-12-36|سماد بودر|سماد كريستال/i.test(
        fullText
      )
    ) {
      const match = availableOptions.find(
        (o) =>
          o.name.includes('مركب') ||
          o.name.toLowerCase().includes('npk') ||
          o.name.includes('أسمدة بودر')
      );
      if (match) {
        suggestedSubId = match.id;
        suggestedSubName = match.name;
        detected.push('سماد NPK', 'تسميد متوازن');
        reason = 'سماد يحتوي على عناصر غذائية كبرى (نيتروجين - فوسفور - بوتاسيوم)';
      }
    }
    // 6. Single / Micronutrient Fertilizer (أسمدة أحادية وعناصر صغرى)
    else if (
      /احادي|أحادي|سوبر فوسفات|سلفات نشادر|يوريا|نترات كالسيوم|حديد|زنك|منجنيز|بورون|مخلبي|عناصر صغرى|هيوميك|فولفيك|سلفات ماغنسيوم/i.test(
        fullText
      )
    ) {
      const match = availableOptions.find(
        (o) =>
          o.name.includes('احادي') ||
          o.name.includes('أحادي') ||
          o.name.includes('عناصر') ||
          o.name.includes('صغرى')
      );
      if (match) {
        suggestedSubId = match.id;
        suggestedSubName = match.name;
        detected.push('سماد أحادي', 'عناصر صغرى / مخلبية');
        reason = 'مركب تسميد أحادي أو مغذيات صغرى مخلبية لتعويض نقص العناصر';
      }
    }
    // 7. Foliar & Biostimulants (مخصبات ورقية ومحفزات نمو)
    else if (
      /مخصب|محفز|أحماض أمينية|طحالب|سيتوكينين|أوكسين|جبرلين|تحجيم|تزهير|تلوين|منشط جذور|مستخلص بحري/i.test(
        fullText
      )
    ) {
      const match = availableOptions.find(
        (o) =>
          o.name.includes('مخصب') ||
          o.name.includes('محفز') ||
          o.name.includes('ورق') ||
          o.name.includes('سائل')
      );
      if (match) {
        suggestedSubId = match.id;
        suggestedSubName = match.name;
        detected.push('مخصب حيوي', 'أحماض أمينية / تحجيم');
        reason = 'محفز نمو ورقي وتنشيط مناعي للتحجيم والتزهير ومقاومة الإجهاد';
      }
    }
    // 8. Match Company-Specific Custom Subcategories
    else {
      const compSubs = subCategories.filter(
        (s) => s.companyId === product.companyId && s.active !== false
      );
      for (const s of compSubs) {
        const tokens = s.name.split(/\s+/).filter((w) => w.length > 3);
        const matchedToken = tokens.find((t) => fullText.includes(t.toLowerCase()));
        if (matchedToken) {
          suggestedSubId = s.id;
          suggestedSubName = s.name;
          detected.push(matchedToken);
          reason = `مطابقة مع قسم شركة "${s.name}"`;
          break;
        }
      }
    }

    // Only propose if we found a valid suggestion AND it differs from the product's current subcategory
    if (suggestedSubId && suggestedSubId !== product.subCategoryId) {
      const currentName =
        getUnifiedSubCategoryName(product.subCategoryId, categories, subCategories) ||
        'غير محدد';
      proposals.push({
        product,
        companyName,
        currentSubCategoryId: product.subCategoryId,
        currentSubCategoryName: currentName,
        suggestedSubCategoryId: suggestedSubId,
        suggestedSubCategoryName: suggestedSubName,
        detectedKeywords: detected,
        reason,
        confidence: detected.length >= 2 ? 'high' : 'medium',
        selected: true,
      });
    }
  }

  return proposals;
}
