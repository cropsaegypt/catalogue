import { Company, Product } from '../types';

export type AppRoute =
  | { type: 'home' }
  | { type: 'company'; slugOrId: string }
  | { type: 'companies' }
  | { type: 'product'; productId: string }
  | { type: 'financing' }
  | { type: 'admin' }
  | { type: 'builder' }
  | { type: 'order'; orderId: string }
  | { type: 'program'; programId: string }
  | { type: 'shared_catalog'; catalogId: string };

/**
 * Normalizes Arabic string for fuzzy matching (removing diacritics, alef variations, etc.)
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/harakat
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\-_]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Resolves a company from slug, id, or normalized name
 */
export function resolveCompanyFromSlugOrId(
  term: string,
  companies: Company[]
): Company | undefined {
  if (!term || !companies.length) return undefined;
  const decoded = decodeURIComponent(term).trim();
  const lower = decoded.toLowerCase();
  const normTerm = normalizeArabicText(decoded);

  // 1. Direct ID match (e.g. COMP-01)
  const byId = companies.find((c) => c.id.toLowerCase() === lower);
  if (byId) return byId;

  // 2. Exact slug match (e.g. keima, كفر-الزيات)
  const bySlug = companies.find((c) => c.slug && c.slug.toLowerCase() === lower);
  if (bySlug) return bySlug;

  // 3. Normalized slug match
  const byNormSlug = companies.find(
    (c) => c.slug && normalizeArabicText(c.slug) === normTerm
  );
  if (byNormSlug) return byNormSlug;

  // 4. Name match (exact or normalized)
  const byName = companies.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      normalizeArabicText(c.name) === normTerm ||
      normalizeArabicText(c.name).includes(normTerm) ||
      normTerm.includes(normalizeArabicText(c.name))
  );
  if (byName) return byName;

  return undefined;
}

/**
 * Resolves a product from productId
 */
export function resolveProductFromId(
  term: string,
  products: Product[]
): Product | undefined {
  if (!term || !products.length) return undefined;
  const decoded = decodeURIComponent(term).trim();
  const lower = decoded.toLowerCase();

  return products.find(
    (p) =>
      p.id.toLowerCase() === lower ||
      (p.slug && p.slug.toLowerCase() === lower) ||
      p.name.toLowerCase() === lower
  );
}

/**
 * Returns human-friendly path for a company
 */
export function getCompanyRoutePath(company: Company): string {
  const identifier = company.slug || company.id;
  return `/company/${encodeURIComponent(identifier)}`;
}

/**
 * Returns human-friendly path for a product
 */
export function getProductRoutePath(product: Product): string {
  return `/product/${encodeURIComponent(product.id)}`;
}

/**
 * Returns human-friendly path for a program
 */
export function getProgramRoutePath(programId: string): string {
  return `/program/${encodeURIComponent(programId)}`;
}

/**
 * Parses current window.location into a structured AppRoute
 */
export function parseCurrentRoute(): AppRoute {
  if (typeof window === 'undefined') return { type: 'home' };

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Check legacy/backward-compatible query parameters (?order=... or ?catalog=... or ?company=...)
  const orderParam = searchParams.get('order') || searchParams.get('orderId');
  if (orderParam) return { type: 'order', orderId: orderParam };

  const programParam = searchParams.get('program') || searchParams.get('programId');
  if (programParam) return { type: 'program', programId: programParam };

  const catalogParam = searchParams.get('catalog') || searchParams.get('c');
  if (catalogParam && !catalogParam.startsWith('COMP-')) {
    return { type: 'shared_catalog', catalogId: catalogParam };
  }

  const companyParam = searchParams.get('company');
  if (companyParam) return { type: 'company', slugOrId: companyParam };

  // 2. Check path segments
  const segments = path
    .split('/')
    .filter(Boolean)
    .map((seg) => decodeURIComponent(seg));

  if (segments.length === 0) {
    return { type: 'home' };
  }

  const first = segments[0]?.toLowerCase();
  const second = segments[1];

  if (first === 'company' || first === 'c') {
    if (second) return { type: 'company', slugOrId: second };
    return { type: 'companies' };
  }

  if (first === 'companies' || first === 'directory') {
    if (second) return { type: 'company', slugOrId: second };
    return { type: 'companies' };
  }

  if (first === 'product' || first === 'p') {
    if (second) return { type: 'product', productId: second };
    return { type: 'home' };
  }

  if (first === 'financing' || first === 'tamweel' || first === 'islamic-financing') {
    return { type: 'financing' };
  }

  if (first === 'admin') {
    return { type: 'admin' };
  }

  if (first === 'builder' || first === 'catalog-builder' || first === 'pdf') {
    return { type: 'builder' };
  }

  if (first === 'order' && second) {
    return { type: 'order', orderId: second };
  }

  if (first === 'program' && second) {
    return { type: 'program', programId: second };
  }

  if (first === 'shared' && second) {
    return { type: 'shared_catalog', catalogId: second };
  }

  return { type: 'home' };
}

/**
 * Smoothly updates browser URL using HTML5 History API while preserving attribution queries (like ?rep=...)
 */
export function navigateTo(targetPath: string, replace = false): void {
  if (typeof window === 'undefined') return;

  const currentUrl = new URL(window.location.href);
  const repParam = currentUrl.searchParams.get('rep') || currentUrl.searchParams.get('salesRep');

  // Normalize target
  const targetUrl = new URL(targetPath.startsWith('/') ? targetPath : `/${targetPath}`, window.location.origin);
  if (repParam && !targetUrl.searchParams.has('rep')) {
    targetUrl.searchParams.set('rep', repParam);
  }

  const finalUrl = targetUrl.pathname + targetUrl.search;
  if (finalUrl !== window.location.pathname + window.location.search) {
    if (replace) {
      window.history.replaceState(null, '', finalUrl);
    } else {
      window.history.pushState(null, '', finalUrl);
    }
  }

  // Notify active listeners
  window.dispatchEvent(new Event('app:route-change'));
}

/**
 * Copies a direct URL to clipboard and returns success status
 */
export async function copyDirectLink(relativeOrAbsoluteUrl: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const fullUrl = relativeOrAbsoluteUrl.startsWith('http')
      ? relativeOrAbsoluteUrl
      : `${window.location.origin}${relativeOrAbsoluteUrl.startsWith('/') ? '' : '/'}${relativeOrAbsoluteUrl}`;
    
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(fullUrl);
      return true;
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = fullUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
