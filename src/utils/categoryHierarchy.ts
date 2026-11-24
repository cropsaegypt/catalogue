import { Category, Company, Product, CompanySubCategory } from '../types';

export function isMainCategory(category: Category): boolean {
  return !category.parentId;
}

export function getMainCategories(categories: Category[]): Category[] {
  return categories.filter((c) => !c.parentId);
}

export function getSubCategories(categories: Category[], parentId?: string): Category[] {
  if (parentId) {
    return categories.filter((c) => c.parentId === parentId);
  }
  return categories.filter((c) => Boolean(c.parentId));
}

export interface UnifiedSubCategoryOption {
  id: string;
  name: string;
  source: 'hierarchical' | 'company';
  parentId?: string;
  companyId?: string;
  type?: string;
}

/**
 * Returns all available subcategories for selection:
 * 1. Child categories under the selected main category (from Category[])
 * 2. Company subcategories belonging to the selected company (from CompanySubCategory[])
 */
export function getUnifiedSubCategoriesForSelection(
  categories: Category[],
  mainCategoryId?: string,
  companyId?: string,
  companySubCategories?: CompanySubCategory[]
): UnifiedSubCategoryOption[] {
  const result: UnifiedSubCategoryOption[] = [];
  const seenIds = new Set<string>();

  // 1. Hierarchical subcategories under the mainCategory (or all if none specified)
  const childCats = getSubCategories(categories, mainCategoryId);
  for (const c of childCats) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      result.push({
        id: c.id,
        name: c.name,
        source: 'hierarchical',
        parentId: c.parentId,
      });
    }
  }

  // 2. Company subcategories if companyId or general
  if (companySubCategories && companySubCategories.length > 0) {
    const compSubs = companyId
      ? companySubCategories.filter((s) => s.companyId === companyId && s.active !== false)
      : companySubCategories.filter((s) => s.active !== false);
    for (const s of compSubs) {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        result.push({
          id: s.id,
          name: s.name,
          source: 'company',
          companyId: s.companyId,
          type: s.type,
        });
      }
    }
  }

  return result;
}

export function getUnifiedSubCategoryName(
  subCategoryId: string | undefined,
  categories: Category[],
  companySubCategories?: CompanySubCategory[]
): string {
  if (!subCategoryId) return '';
  const cat = categories.find((c) => c.id === subCategoryId);
  if (cat) return cat.name;
  if (companySubCategories) {
    const sub = companySubCategories.find((s) => s.id === subCategoryId);
    if (sub) return sub.name;
  }
  return '';
}

export function getProductMainCategoryId(product: Product, categories: Category[]): string {
  // 1. Direct match on product.categoryId:
  // If product.categoryId points directly to an established Main Category (e.g. CAT-01, CAT-02, CAT-759728), return it!
  // If product.categoryId points to a subcategory with a parentId, return parent's ID.
  const directCat = categories.find(
    (c) =>
      c.id === product.categoryId ||
      c.slug === product.categoryId ||
      c.name.trim().toLowerCase() === (product.categoryId || '').trim().toLowerCase()
  );
  if (directCat) {
    if (directCat.parentId) {
      const parent = categories.find((c) => c.id === directCat.parentId);
      return parent ? parent.id : directCat.parentId;
    }
    return directCat.id;
  }

  // 2. Fallback to subCategoryId if categoryId is empty or unresolved:
  if (product.subCategoryId) {
    const subCat = categories.find(
      (c) =>
        (c.id === product.subCategoryId ||
          c.slug === product.subCategoryId ||
          c.name.trim().toLowerCase() === product.subCategoryId.trim().toLowerCase()) &&
        Boolean(c.parentId)
    );
    if (subCat?.parentId) {
      const parent = categories.find((c) => c.id === subCat.parentId);
      return parent ? parent.id : subCat.parentId;
    }
  }

  // 3. Agronomy Type & Keywords resolution (fixes Excel imports where categoryId was unassigned)
  const prodName = typeof product.name === 'string' ? product.name : '';
  const searchTags = Array.isArray(product.searchTags) ? product.searchTags.join(' ') : '';
  const fullText = `${prodName} ${product.shortDescription || ''} ${searchTags}`.toLowerCase();

  // 3a. Pesticide check
  if (
    product.productType === 'pesticide' ||
    /مبيد|حشري|فطري|حشائش|نيماتودا|أكاروسي|عناككب|دودة|ديدان|بياض دقيقي|لفحة|زبول|صدأ|ذبابة|توتا أبسلوتا|pesticide|fungicide|insecticide|herbicide/i.test(fullText)
  ) {
    const pCat = categories.find(
      (c) =>
        !c.parentId &&
        (c.slug === 'pesticides' ||
          c.name.replace(/^(ال)/, '').includes('مبيد') ||
          c.id === 'CAT-759728' ||
          c.id === 'CAT-03')
    );
    if (pCat) return pCat.id;
  }

  // 3b. Stimulant check
  if (
    product.productType === 'stimulant' ||
    /مخصب|محفز|أحماض|هيوميك|فولفيك|طحالب|تزهير|عقد|سيتوكينين|أوكسين|جبريلين|تحجيم|منشط جذور|stimulant/i.test(fullText)
  ) {
    const sCat = categories.find(
      (c) =>
        !c.parentId &&
        (c.slug === 'stimulants' ||
          c.name.replace(/^(ال)/, '').includes('مخصب') ||
          c.id === 'CAT-01')
    );
    if (sCat) return sCat.id;
  }

  // 3c. Fertilizer check
  if (
    product.productType === 'fertilizer' ||
    /سماد|أسمدة|سولوبوتاس|نترات|سلفات|يوريا|فوسفات|بوتاسيوم|كالسيوم|مغنيسيوم|حديد مخلبي|زنك مخلبي|عناصر كبرى|عناصر صغرى|npk|fertilizer/i.test(fullText)
  ) {
    const fCat = categories.find(
      (c) =>
        !c.parentId &&
        (c.slug === 'fertilizers' ||
          c.name.replace(/^(ال)/, '').includes('سماد') ||
          c.name.replace(/^(ال)/, '').includes('أسمدة') ||
          c.id === 'CAT-02')
    );
    if (fCat) return fCat.id;
  }

  return product.categoryId;
}

export function getProductSubCategoryId(
  product: Product,
  categories: Category[]
): string | undefined {
  const mainCatId = getProductMainCategoryId(product, categories);

  if (product.subCategoryId) {
    const existsAsSub = categories.find(
      (c) =>
        (c.id === product.subCategoryId ||
          c.slug === product.subCategoryId ||
          c.name.trim().toLowerCase() === product.subCategoryId.trim().toLowerCase()) &&
        Boolean(c.parentId)
    );
    // Crucial: Only accept this subcategory if its parentId actually matches the product's main category!
    if (existsAsSub && (!existsAsSub.parentId || existsAsSub.parentId === mainCatId)) {
      return existsAsSub.id;
    }
  }

  const assignedCat = categories.find(
    (c) =>
      c.id === product.categoryId ||
      c.slug === product.categoryId ||
      c.name.trim().toLowerCase() === (product.categoryId || '').trim().toLowerCase()
  );
  if (assignedCat?.parentId && (!mainCatId || assignedCat.parentId === mainCatId)) {
    return assignedCat.id;
  }

  return undefined;
}

export function getCategoryDisplayPath(
  categoryId: string,
  subCategoryId: string | undefined,
  categories: Category[],
  companySubCategories?: CompanySubCategory[]
): { mainCategory?: Category; subCategory?: Category } {
  let sub = subCategoryId
    ? categories.find(
        (c) =>
          (c.id === subCategoryId ||
            c.slug === subCategoryId ||
            c.name.trim().toLowerCase() === subCategoryId.trim().toLowerCase()) &&
          Boolean(c.parentId)
      )
    : undefined;

  let assignedCat = categories.find(
    (c) =>
      c.id === categoryId ||
      c.slug === categoryId ||
      c.name.trim().toLowerCase() === (categoryId || '').trim().toLowerCase()
  );

  if (!sub && subCategoryId && companySubCategories && companySubCategories.length > 0) {
    const compSub = companySubCategories.find((s) => s.id === subCategoryId);
    if (compSub) {
      sub = {
        id: compSub.id,
        name: compSub.name,
        slug: compSub.id.toLowerCase(),
        description: compSub.description,
        displayOrder: compSub.displayOrder,
        active: compSub.active !== false,
        parentId: assignedCat?.id,
        createdAt: '',
        updatedAt: '',
      };
    }
  }

  // 1. If assignedCat is an established main category:
  if (assignedCat && !assignedCat.parentId) {
    const validSub = sub?.parentId === assignedCat.id ? sub : undefined;
    return {
      mainCategory: assignedCat,
      subCategory: validSub,
    };
  }

  // 2. If assignedCat is a subcategory:
  if (assignedCat?.parentId) {
    return {
      mainCategory: categories.find((c) => c.id === assignedCat.parentId),
      subCategory: assignedCat,
    };
  }

  // 3. Fallback: if sub has a parent
  if (sub?.parentId) {
    const main = categories.find((c) => c.id === sub.parentId);
    return {
      mainCategory: main || assignedCat,
      subCategory: sub,
    };
  }

  return {
    mainCategory: assignedCat,
    subCategory: sub,
  };
}

/**
 * Matches a product against multi-select main categories & optional sub-categories.
 * When a main category AND some of its sub-categories are selected, only products inside
 * those selected sub-categories match that main category. Other selected main categories
 * with no chosen sub-categories still match all their products.
 */
export function productMatchesCategoryFilter(
  product: Product,
  selectedMainIds: string[],
  selectedSubIds: string[],
  categories: Category[]
): boolean {
  if (selectedMainIds.length === 0 && selectedSubIds.length === 0) {
    return true;
  }

  const prodMainId = getProductMainCategoryId(product, categories);
  const prodSubId = getProductSubCategoryId(product, categories);

  if (selectedMainIds.length === 0) {
    return Boolean(prodSubId && selectedSubIds.includes(prodSubId));
  }

  return selectedMainIds.some((mainId) => {
    // Normalize comparison: match either exact ID or normalized name (with/without 'ال')
    const selectedCat = categories.find((c) => c.id === mainId);
    const prodCat = categories.find((c) => c.id === prodMainId);
    const namesMatch =
      selectedCat &&
      prodCat &&
      selectedCat.name.replace(/^(ال)/, '').trim().toLowerCase() ===
        prodCat.name.replace(/^(ال)/, '').trim().toLowerCase();

    if (prodMainId !== mainId && !namesMatch) return false;

    const selectedSubsUnderThisMain = selectedSubIds.filter((subId) =>
      categories.some((c) => c.id === subId && c.parentId === mainId)
    );

    if (selectedSubsUnderThisMain.length > 0) {
      return Boolean(prodSubId && selectedSubsUnderThisMain.includes(prodSubId));
    }

    return true;
  });
}


export interface CompanyAvailabilityItem {
  company: Company;
  totalCount: number;
  matchingCount: number;
  isAvailable: boolean;
}

export interface MainCategoryAvailabilityItem {
  category: Category;
  matchingCount: number;
  subCategoriesCount: number;
}

export interface SubCategoryAvailabilityItem {
  category: Category;
  parentCategory?: Category;
  matchingCount: number;
}

export interface CrossFilterResult {
  allCompaniesMeta: CompanyAvailabilityItem[];
  visibleCompaniesMeta: CompanyAvailabilityItem[];
  visibleMainCategories: MainCategoryAvailabilityItem[];
  visibleSubCategories: SubCategoryAvailabilityItem[];
  hasCategoryRestrictionOnCompanies: boolean;
  hasCompanyRestrictionOnCategories: boolean;
}

/**
 * Bidirectional cross-filtering between Companies and Main/Sub Categories:
 * - Selecting companies filters categories & subcategories down to those that actually have products in the chosen companies.
 * - Selecting categories/subcategories keeps only matching companies highlighted/visible in the main bar, while preserving multi-select.
 */
export function computeCrossFilterAvailability(params: {
  products: Product[];
  companies: Company[];
  categories: Category[];
  selectedCompanyIds: string[];
  selectedCategoryIds: string[];
  selectedSubCategoryIds: string[];
}): CrossFilterResult {
  const {
    products,
    companies,
    categories,
    selectedCompanyIds,
    selectedCategoryIds,
    selectedSubCategoryIds,
  } = params;

  const activeProducts = products.filter((p) => p.active !== false);
  const activeCompanies = companies.filter((c) => c.active !== false);
  const activeMainCats = categories.filter((c) => c.active !== false && !c.parentId);
  const activeSubCats = categories.filter((c) => c.active !== false && Boolean(c.parentId));

  const hasCatSelection = selectedCategoryIds.length > 0 || selectedSubCategoryIds.length > 0;
  const hasCompanySelection = selectedCompanyIds.length > 0;

  const categoryFilteredProducts = hasCatSelection
    ? activeProducts.filter((p) =>
        productMatchesCategoryFilter(p, selectedCategoryIds, selectedSubCategoryIds, categories)
      )
    : activeProducts;

  const allCompaniesMeta: CompanyAvailabilityItem[] = activeCompanies.map((company) => {
    const totalCount = activeProducts.filter((p) => p.companyId === company.id).length;
    const matchingCount = categoryFilteredProducts.filter((p) => p.companyId === company.id).length;
    return {
      company,
      totalCount,
      matchingCount,
      isAvailable: !hasCatSelection || matchingCount > 0,
    };
  });

  const visibleCompaniesMeta = hasCatSelection
    ? allCompaniesMeta.filter(
        (item) => item.matchingCount > 0 || selectedCompanyIds.includes(item.company.id)
      )
    : allCompaniesMeta;

  const companyFilteredProducts = hasCompanySelection
    ? activeProducts.filter((p) => selectedCompanyIds.includes(p.companyId))
    : activeProducts;

  const mainCategoriesMeta: MainCategoryAvailabilityItem[] = activeMainCats.map((cat) => {
    const matchingCount = companyFilteredProducts.filter(
      (p) => getProductMainCategoryId(p, categories) === cat.id
    ).length;
    const subCategoriesCount = activeSubCats.filter((sub) => sub.parentId === cat.id).length;
    return {
      category: cat,
      matchingCount,
      subCategoriesCount,
    };
  });

  const visibleMainCategories = hasCompanySelection
    ? mainCategoriesMeta.filter(
        (item) => item.matchingCount > 0 || selectedCategoryIds.includes(item.category.id)
      )
    : mainCategoriesMeta;

  const visibleSubCategories: SubCategoryAvailabilityItem[] =
    selectedCategoryIds.length === 0
      ? []
      : activeSubCats
          .filter((sub) => sub.parentId && selectedCategoryIds.includes(sub.parentId))
          .map((sub) => {
            const matchingCount = companyFilteredProducts.filter(
              (p) => getProductSubCategoryId(p, categories) === sub.id
            ).length;
            return {
              category: sub,
              parentCategory: activeMainCats.find((m) => m.id === sub.parentId),
              matchingCount,
            };
          })
          .filter(
            (item) =>
              !hasCompanySelection ||
              item.matchingCount > 0 ||
              selectedSubCategoryIds.includes(item.category.id)
          );

  return {
    allCompaniesMeta,
    visibleCompaniesMeta,
    visibleMainCategories,
    visibleSubCategories,
    hasCategoryRestrictionOnCompanies: hasCatSelection,
    hasCompanyRestrictionOnCategories: hasCompanySelection,
  };
}
