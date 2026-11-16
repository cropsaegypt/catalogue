import { Category, Company, Product } from '../types';

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

export function getProductMainCategoryId(product: Product, categories: Category[]): string {
  // 1. Direct match by ID, slug, or exact name
  const cat = categories.find(
    (c) => c.id === product.categoryId || c.slug === product.categoryId || c.name === product.categoryId
  );
  if (cat?.parentId) {
    const parent = categories.find((c) => c.id === cat.parentId);
    return parent ? parent.id : cat.parentId;
  }
  if (cat) {
    return cat.id;
  }

  // 2. Check if subCategoryId points to a category with a parentId
  if (product.subCategoryId) {
    const subCat = categories.find(
      (c) =>
        (c.id === product.subCategoryId ||
          c.slug === product.subCategoryId ||
          c.name === product.subCategoryId) &&
        Boolean(c.parentId)
    );
    if (subCat?.parentId) {
      const parent = categories.find((c) => c.id === subCat.parentId);
      return parent ? parent.id : subCat.parentId;
    }
  }

  // 3. Fallback by productType (pesticide -> المبيدات, stimulant -> المخصبات, fertilizer -> الأسمدة)
  if (product.productType) {
    if (product.productType === 'pesticide') {
      const pCat = categories.find(
        (c) => !c.parentId && (c.slug === 'pesticides' || c.name.includes('مبيد') || c.id === 'CAT-03')
      );
      if (pCat) return pCat.id;
    } else if (product.productType === 'stimulant') {
      const sCat = categories.find(
        (c) => !c.parentId && (c.slug === 'stimulants' || c.name.includes('مخصب') || c.id === 'CAT-02')
      );
      if (sCat) return sCat.id;
    } else if (product.productType === 'fertilizer') {
      const fCat = categories.find(
        (c) =>
          !c.parentId &&
          (c.slug === 'fertilizers' || c.name.includes('سماد') || c.name.includes('أسمدة') || c.id === 'CAT-01')
      );
      if (fCat) return fCat.id;
    }
  }

  return product.categoryId;
}

export function getProductSubCategoryId(
  product: Product,
  categories: Category[]
): string | undefined {
  if (product.subCategoryId) {
    const existsAsSub = categories.find(
      (c) =>
        (c.id === product.subCategoryId ||
          c.slug === product.subCategoryId ||
          c.name === product.subCategoryId) &&
        Boolean(c.parentId)
    );
    if (existsAsSub) return existsAsSub.id;
  }

  const assignedCat = categories.find(
    (c) =>
      c.id === product.categoryId ||
      c.slug === product.categoryId ||
      c.name === product.categoryId
  );
  if (assignedCat?.parentId) {
    return assignedCat.id;
  }

  return product.subCategoryId;
}

export function getCategoryDisplayPath(
  categoryId: string,
  subCategoryId: string | undefined,
  categories: Category[]
): { mainCategory?: Category; subCategory?: Category } {
  const assignedCat = categories.find(
    (c) => c.id === categoryId || c.slug === categoryId || c.name === categoryId
  );
  if (assignedCat?.parentId) {
    return {
      mainCategory: categories.find((c) => c.id === assignedCat.parentId),
      subCategory: assignedCat,
    };
  }

  const sub = subCategoryId
    ? categories.find(
        (c) =>
          (c.id === subCategoryId || c.slug === subCategoryId || c.name === subCategoryId) &&
          Boolean(c.parentId)
      )
    : undefined;

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
    if (prodMainId !== mainId) return false;

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
