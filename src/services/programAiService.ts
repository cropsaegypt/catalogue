import {
  Product,
  Company,
  Package,
  ProgramType,
  SoilType,
  IrrigationType,
  DrainageType,
  ProgramItem,
} from '../types';

export interface RecommendProgramParams {
  crop: string;
  growthStage?: string;
  areaAcres: number;
  soilType: SoilType;
  irrigationType: IrrigationType;
  drainageType: DrainageType;
  programType: ProgramType;
  targetIssues?: string[];
  selectedCompanyIds: string[];
  products: Product[];
  companies: Company[];
  packages: Package[];
  customApiKey?: string;
}

export interface RecommendationResult {
  title: string;
  recommendations: ProgramItem[];
  agronomicAdvice: string[];
  source: 'gemini' | 'rules_engine';
}

/**
 * Standard crops list with typical Arabic names
 */
export const POPULAR_CROPS = [
  'طماطم',
  'بطاطس',
  'فراولة',
  'موالح (برتقال / يوسفي / ليمون)',
  'عنب',
  'بصل وثوم',
  'خيار وصوب',
  'فلفل وشطة',
  'باذنجان',
  'بنجر سكر',
  'قمح وحبوب',
  'ذرة',
  'مانجو وفواكه',
  'زيتون',
  'برسيم وأعلاف',
];

export const GROWTH_STAGES = [
  { id: 'establishment', label: 'تأسيس وبداية موسم وتنشيط جذور' },
  { id: 'vegetative', label: 'نمو خضري وتفريع وتكوين مجموع' },
  { id: 'flowering', label: 'تزهير وتثبيت العقد وزيادة الخصوبة' },
  { id: 'sizing', label: 'تحجيم الثمار وامتلاء وتلوين ونضج' },
  { id: 'stress_recovery', label: 'علاج إجهاد حراري / صقيع / ملوحة' },
  { id: 'curative_pest', label: 'مكافحة علاجية فورية لآفات أو أمراض' },
];

export const SOIL_TYPES: { id: SoilType; label: string; desc: string }[] = [
  { id: 'clay', label: 'تربة طينية ثقيلة', desc: 'صرف أبطأ واحتفاظ عالي بالرطوبة والعناصر' },
  { id: 'sandy', label: 'تربة رملية خفيفة', desc: 'سريعة الصرف وتتطلب دفعات تسميد متقاربة ومخصبات مخلبية' },
  { id: 'calcareous', label: 'تربة كلسية جيرية (High pH)', desc: 'تحتاج أحماض وهيوميك لمعادلة القلوية وتيسير الفسفور والحديد' },
  { id: 'silt', label: 'تربة طميية صفراء متوازنة', desc: 'خصوبة متوازنة وجيدة الصرف' },
  { id: 'other', label: 'تربة بديلة / بيتموس / هيدروبونيك', desc: 'زراعة محمية ومغذيات خاصة' },
];

export const IRRIGATION_TYPES: { id: IrrigationType; label: string }[] = [
  { id: 'drip', label: 'ري بالتنقيط (شبكة خراطيم)' },
  { id: 'pivot', label: 'ري محوري (بيڤوت)' },
  { id: 'flood', label: 'ري بالغمر (سطحي)' },
  { id: 'sprinkler', label: 'ري بالرشاشات' },
  { id: 'other', label: 'أخرى' },
];

export const DRAINAGE_TYPES: { id: DrainageType; label: string }[] = [
  { id: 'good', label: 'صرف جيد ومثالي' },
  { id: 'medium', label: 'صرف متوسط' },
  { id: 'poor', label: 'صرف ضعيف أو به مشاكل ملوحة' },
];

export const COMMON_TARGET_ISSUES = [
  'تنشيط جذور قوي وعلاج عفن',
  'تزهير مكثف ومنع تساقط العقد',
  'تحجيم عالي وسرعة تلوين',
  'علاج اصفرار ونقص عناصر',
  'مكافحة دودة حاشدة وتوتا أبسلوتا',
  'مكافحة حشرات من وتربس وذبابة بيضاء',
  'مكافحة بياض دقيقي وزغبي ولفحة',
  'رفع إجهاد حرارة وصقيع وملوحة',
];

/**
 * Intelligent Local Agronomic Engine
 * Analyzes crop, farm parameters, and chosen companies to recommend the best products
 */
export function generateLocalAgronomicProgram(params: RecommendProgramParams): RecommendationResult {
  const {
    crop,
    growthStage = 'vegetative',
    areaAcres,
    soilType,
    irrigationType,
    drainageType = 'good',
    programType,
    targetIssues = [],
    selectedCompanyIds,
    products,
    companies,
    packages,
  } = params;

  const compMap = new Map(companies.map((c) => [c.id, c.name]));
  const pkgMap = new Map<string, Package>();
  for (const pkg of packages) {
    if (!pkgMap.has(pkg.productId)) {
      pkgMap.set(pkg.productId, pkg);
    }
  }

  // Filter products by selected companies
  const companyPool = products.filter(
    (p) => p.active !== false && (selectedCompanyIds.length === 0 || selectedCompanyIds.includes(p.companyId))
  );

  const pool = companyPool.length > 0 ? companyPool : products;

  const selectedItems: ProgramItem[] = [];
  const addedProductIds = new Set<string>();

  const isFertilizerNeeded = programType === 'fertilizer' || programType === 'integrated';
  const isPesticideNeeded = programType === 'protection' || programType === 'integrated';

  // 1. Soil & Root Conditioner (Stimulant / Humic / Rooter) - especially for calcareous/sandy
  if (isFertilizerNeeded) {
    const rooter = pool.find(
      (p) =>
        !addedProductIds.has(p.id) &&
        (p.categoryId === 'CAT-01' || p.productType === 'stimulant') &&
        /هيوميك|فولفيك|جذور|تجذير|منشط|أحماض/i.test(`${p.name} ${p.shortDescription || ''}`)
    );
    if (rooter) {
      addedProductIds.add(rooter.id);
      const pkg = pkgMap.get(rooter.id);
      const originalPrice = pkg?.price || 350;
      const unitPrice = Math.round(originalPrice * 0.9); // default 10% commercial discount
      const dose = soilType === 'calcareous' ? '2 كجم / فدان حقناً' : '1.5 لتر / فدان حقناً مع ماء الري';
      const quantity = Math.max(1, Math.ceil(areaAcres * (soilType === 'calcareous' ? 2 : 1.5) / (pkg?.quantity || 1)));

      selectedItems.push({
        id: `ITEM-${Date.now()}-1`,
        productId: rooter.id,
        productName: rooter.name,
        companyId: rooter.companyId,
        companyName: compMap.get(rooter.companyId) || 'شركة معتمدة',
        packageId: pkg?.id,
        packageName: pkg?.displayName || 'عبوة 1 لتر',
        categoryName: 'مخصبات وتنشيط جذور',
        imageUrl: rooter.mainImageUrl,
        dose,
        timing: 'الرية الأولى (بداية الأسبوع الأول)',
        stage: 'معاملة أرضية لتنشيط الجذور ومعادلة التربة',
        unitPrice,
        originalPrice,
        discountPercent: 10,
        quantity,
        totalPrice: quantity * unitPrice,
        reason:
          soilType === 'calcareous'
            ? 'هام جداً للتربة الكلسية لتخفيض قلوية التربة وتيسير امتصاص الفسفور والعناصر الصغرى'
            : 'لتحفيز تكوين شعيرات جذرية قوية وسرعة امتصاص العناصر الغذائية',
      });
    }
  }

  // 2. Main Macro-nutrients (NPK / Specialized Fertilizer) tailored to stage
  if (isFertilizerNeeded) {
    let npkKeyword = /عالي فسفور|تزهير|10-52-10|12-61-0/i;
    let stageTiming = 'رية ثانية في مرحلة التزهير';
    let stageDesc = 'تغذية فسفورية عالية لتحفيز التزهير وتثبيت العقد';

    if (growthStage === 'establishment') {
      npkKeyword = /فسفور|10-52-10|متوازن|20-20-20/i;
      stageTiming = 'الأسبوع الأول والثاني';
      stageDesc = 'لبناء المجموع الجذري وبداية التفريع';
    } else if (growthStage === 'sizing') {
      npkKeyword = /بوتاسيوم|سولوبوتاس|نترات بوتاسيوم|0-0-50|5-10-40/i;
      stageTiming = 'ريات مرحلة التحجيم حتى النضج';
      stageDesc = 'لزيادة الوزن ورفع السكر وتلوين الثمار وتحسين الصلابة';
    } else if (growthStage === 'vegetative') {
      npkKeyword = /متوازن|20-20-20|19-19-19|نيتروجين/i;
      stageTiming = 'كل 5 إلى 7 أيام خلال مرحلة النمو الخضري';
      stageDesc = 'لبناء هيكل خضري قوي وزيادة عدد الفروع الحاملة للثمار';
    }

    const npkProd = pool.find(
      (p) =>
        !addedProductIds.has(p.id) &&
        (p.categoryId === 'CAT-02' || p.productType === 'fertilizer') &&
        npkKeyword.test(`${p.name} ${p.shortDescription || ''}`)
    ) || pool.find(
      (p) => !addedProductIds.has(p.id) && (p.categoryId === 'CAT-02' || p.productType === 'fertilizer')
    );

    if (npkProd) {
      addedProductIds.add(npkProd.id);
      const pkg = pkgMap.get(npkProd.id);
      const originalPrice = pkg?.price || 650;
      const unitPrice = Math.round(originalPrice * 0.9);
      const dose = irrigationType === 'flood' ? '5 كجم / فدان' : '3 كجم / فدان سمادة';
      const quantity = Math.max(1, Math.ceil(areaAcres * (irrigationType === 'flood' ? 5 : 3) / (pkg?.quantity || 25)));

      selectedItems.push({
        id: `ITEM-${Date.now()}-2`,
        productId: npkProd.id,
        productName: npkProd.name,
        companyId: npkProd.companyId,
        companyName: compMap.get(npkProd.companyId) || 'شركة معتمدة',
        packageId: pkg?.id,
        packageName: pkg?.displayName || 'شكارة 25 كجم',
        categoryName: 'أسمدة NPK وتغذية أساسية',
        imageUrl: npkProd.mainImageUrl,
        dose,
        timing: stageTiming,
        stage: stageDesc,
        unitPrice,
        originalPrice,
        discountPercent: 10,
        quantity,
        totalPrice: quantity * unitPrice,
        reason: `مركب أساسي لتوفير العناصر الغذائية المناسبة لمرحلة ${crop} الحالية بكفاءة استيعاب عالية`,
      });
    }
  }

  // 3. Foliar Micro-elements / Calcium Boron / Seaweed Extract (Specialty Stimulant)
  if (isFertilizerNeeded) {
    const foliarProd = pool.find(
      (p) =>
        !addedProductIds.has(p.id) &&
        (p.categoryId === 'CAT-01' || p.productType === 'stimulant') &&
        /كالسيوم|بورون|طحالب|سيتوكينين|أحماض أمينية|زنك|حديد|عناصر صغرى/i.test(`${p.name} ${p.shortDescription || ''}`)
    );

    if (foliarProd) {
      addedProductIds.add(foliarProd.id);
      const pkg = pkgMap.get(foliarProd.id);
      const originalPrice = pkg?.price || 420;
      const unitPrice = Math.round(originalPrice * 0.88);
      const dose = '200 إلى 250 سم / 100 لتر ماء (رش ورقي)';
      const quantity = Math.max(1, Math.ceil(areaAcres * 0.5 / (pkg?.quantity || 1)));

      selectedItems.push({
        id: `ITEM-${Date.now()}-3`,
        productId: foliarProd.id,
        productName: foliarProd.name,
        companyId: foliarProd.companyId,
        companyName: compMap.get(foliarProd.companyId) || 'شركة معتمدة',
        packageId: pkg?.id,
        packageName: pkg?.displayName || 'عبوة 1 لتر',
        categoryName: 'مغذيات ورقية وعناصر صغرى',
        imageUrl: foliarProd.mainImageUrl,
        dose,
        timing: 'رش ورقي في الصباح الباكر أو بعد انكسار الشمس',
        stage: 'رفع مناعة النبات وتحسين كفاءة البناء الضوئي',
        unitPrice,
        originalPrice,
        discountPercent: 12,
        quantity,
        totalPrice: quantity * unitPrice,
        reason: 'حماية الأزهار من السقوط وتأمين صلابة الجدر الخلوية ومنع تشوه الثمار ونقص الكالسيوم',
      });
    }
  }

  // 4. Crop Protection: Fungal / Soil-borne pathogens (Pesticide)
  if (isPesticideNeeded) {
    const fungalProd = pool.find(
      (p) =>
        !addedProductIds.has(p.id) &&
        (p.categoryId === 'CAT-759728' || p.productType === 'pesticide') &&
        /فطري|أعفان|بياض|لفحة|فيوزاريوم|بيثيوم|مانكوزيب|ميتالاكسيل|أزوكسيستروبين|سيموكسانيل/i.test(
          `${p.name} ${p.shortDescription || ''} ${Array.isArray(p.searchTags) ? p.searchTags.join(' ') : ''}`
        )
    );

    if (fungalProd) {
      addedProductIds.add(fungalProd.id);
      const pkg = pkgMap.get(fungalProd.id);
      const originalPrice = pkg?.price || 480;
      const unitPrice = Math.round(originalPrice * 0.9);
      const dose = drainageType === 'poor' ? '250 جم / 100 لتر ماء' : '200 جم / 100 لتر ماء';
      const quantity = Math.max(1, Math.ceil(areaAcres * 0.4 / (pkg?.quantity || 1)));

      selectedItems.push({
        id: `ITEM-${Date.now()}-4`,
        productId: fungalProd.id,
        productName: fungalProd.name,
        companyId: fungalProd.companyId,
        companyName: compMap.get(fungalProd.companyId) || 'شركة معتمدة',
        packageId: pkg?.id,
        packageName: pkg?.displayName || 'عبوة 500 جم',
        categoryName: 'مبيدات وقائية وعلاجية للفطريات',
        imageUrl: fungalProd.mainImageUrl,
        dose,
        timing: drainageType === 'poor' ? 'حقناً مع ماء الري لحماية الجذور' : 'رش وقائي دوري كل 12-15 يوم',
        stage: 'حماية وقائية من أمراض التربة والبياض',
        unitPrice,
        originalPrice,
        discountPercent: 10,
        quantity,
        totalPrice: quantity * unitPrice,
        reason:
          drainageType === 'poor'
            ? 'نظراً لضعف الصرف، هذا المركب ضروري لحماية الشعيرات الجذرية من أعفان الجذور والبيثيوم'
            : 'تأمين كامل ضد اللفحات والتبقعات الفطرية لضمان سلامة الأوراق والمحصول',
      });
    }
  }

  // 5. Crop Protection: Insecticide (Pests, Worms, Whiteflies, Thrips)
  if (isPesticideNeeded) {
    const insectProd = pool.find(
      (p) =>
        !addedProductIds.has(p.id) &&
        (p.categoryId === 'CAT-759728' || p.productType === 'pesticide') &&
        /حشري|توتا أبسلوتا|دودة|ذبابة|من|تربس|سوسة|إميداكلوبريد|لمبادا|بيتا سيفلوثرين|كلورانترانيليبرول/i.test(
          `${p.name} ${p.shortDescription || ''} ${Array.isArray(p.searchTags) ? p.searchTags.join(' ') : ''}`
        )
    );

    if (insectProd) {
      addedProductIds.add(insectProd.id);
      const pkg = pkgMap.get(insectProd.id);
      const originalPrice = pkg?.price || 520;
      const unitPrice = Math.round(originalPrice * 0.9);
      const dose = '150 إلى 200 سم / 100 لتر ماء';
      const quantity = Math.max(1, Math.ceil(areaAcres * 0.3 / (pkg?.quantity || 1)));

      selectedItems.push({
        id: `ITEM-${Date.now()}-5`,
        productId: insectProd.id,
        productName: insectProd.name,
        companyId: insectProd.companyId,
        companyName: compMap.get(insectProd.companyId) || 'شركة معتمدة',
        packageId: pkg?.id,
        packageName: pkg?.displayName || 'عبوة 250 سم',
        categoryName: 'مبيدات حشرية وصحة نباتية',
        imageUrl: insectProd.mainImageUrl,
        dose,
        timing: 'عند رصد أول إصابة حشرية أو كمعاملة وقائية مسائية',
        stage: 'مكافحة ثواقب وديدان وحشرات ماصة',
        unitPrice,
        originalPrice,
        discountPercent: 10,
        quantity,
        totalPrice: quantity * unitPrice,
        reason: `مكافحة صاعقة وممتدة المفعول لحماية مجموع أوراق وثمار ${crop} من الحشرات الثاقبة والديدان`,
      });
    }
  }

  // Tailored agronomic recommendations
  const agronomicAdvice: string[] = [
    `تم تصميم هذا البرنامج خصيصاً لمساحة ${areaAcres} فدان من محصول ${crop} لتحقيق أقصى عائد إنتاجي وأعلى جودة تسويقية.`,
    soilType === 'calcareous'
      ? 'تنبيه زراعي: التربة كلسية جيرية، يرجى مراعاة تقليل فترات التعطيش واستخدام الأحماض العضوية بانتظام لتيسير الفسفور.'
      : soilType === 'sandy'
      ? 'تنبيه زراعي: التربة رملية سريعة الصرف، يفضل تجزئة كميات السماد على دفعات متقاربة مع ماء الري لتجنب غسيل العناصر.'
      : 'تنبيه زراعي: التربة طينية، احرص على ضبط كميات مياه الري لتفادي زيادة الرطوبة حول الجذور وتشجيع التهوية.',
    irrigationType === 'drip'
      ? 'نظام الري بالتنقيط: تأكد من حقن المبيدات في الثلث الأخير من مدة الري، ثم تشغيل المياه النقية لمدة 10 دقائق لغسيل الشبكة.'
      : 'نظام الري: يفضل إجراء الرش الورقي في الساعات الأولى من الصباح أو بعد انكسار أشعة الشمس وقت الغروب.',
    'يراعى عدم خلط المركبات النحاسية مع الأحماض الأمينية أو الزيوت المعدنية، وتجربة الخلط دائماً في عبوة صغيرة أولاً.',
  ];

  const typeArabic =
    programType === 'fertilizer' ? 'تسميد وتغذية' : programType === 'protection' ? 'وقاية ومكافحة' : 'تسميد ومكافحة متكامل';

  return {
    title: `برنامج ${typeArabic} لمحصول ${crop} (${areaAcres} فدان)`,
    recommendations: selectedItems,
    agronomicAdvice,
    source: 'rules_engine',
  };
}

/**
 * Main Recommendation Entry Point
 * Tries Gemini AI with instant intelligent agronomic engine fallback
 */
export async function recommendAgronomicProgram(
  params: RecommendProgramParams
): Promise<RecommendationResult> {
  const localResult = generateLocalAgronomicProgram(params);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('/api/gemini/recommend-program', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crop: params.crop,
        growthStage: params.growthStage,
        areaAcres: params.areaAcres,
        soilType: params.soilType,
        irrigationType: params.irrigationType,
        drainageType: params.drainageType,
        programType: params.programType,
        targetIssues: params.targetIssues,
        selectedCompanyIds: params.selectedCompanyIds,
        customApiKey: params.customApiKey,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          title: json.data.title || localResult.title,
          recommendations:
            Array.isArray(json.data.recommendations) && json.data.recommendations.length > 0
              ? json.data.recommendations
              : localResult.recommendations,
          agronomicAdvice:
            Array.isArray(json.data.agronomicAdvice) && json.data.agronomicAdvice.length > 0
              ? json.data.agronomicAdvice
              : localResult.agronomicAdvice,
          source: 'gemini',
        };
      }
    }
  } catch {
    // Return high-quality local agronomic recommendations
  }

  return localResult;
}
