import { Product } from '../types';

export type CatalogDetailMode = 'full' | 'concise';

export interface ProductCatalogSummary {
  shortSummary: string;
  characteristics: string[];
  composition: string[];
  usage: string[];
}

export interface ProductCatalogOverride {
  /** 'full' | 'concise'; undefined means inherit the catalog-wide detail mode. */
  mode?: CatalogDetailMode;
  /** Optional custom or AI-refined concise summary fields. */
  customSummary?: Partial<ProductCatalogSummary>;
}

const ARABIC_FILLER_PREFIXES: RegExp[] = [
  /^(?:يتميز|يمتاز)\s+(?:هذا\s+)?(?:المنتج|المركب|السماد|المبيد|المخصب)?\s*ب(?:ـ|أن|انه|أنه)?\s*/i,
  /^(?:يعمل|يساعد|يساهم)\s+(?:هذا\s+)?(?:المنتج|المركب|السماد|المبيد)?\s*(?:على|في|بفاعلية\s+على)\s*/i,
  /^(?:يحتوي|يتركب)\s+(?:على|من)\s+(?:نسبة\s+عالية\s+من\s+)?/i,
  /^(?:له|ذو)\s+(?:قدرة\s+فائقة|دور\s+فعال|تأثير\s+مباشر)\s+(?:على|في)\s*/i,
  /^(?:مركب|سماد|مبيد|مخصب)\s+(?:زراعي\s+)?(?:متخصص|فعال|قوي|فريد|متطور)\s+(?:في|لـ|ل)?\s*/i,
  /^(?:يستخدم|يُستخدم|موصى\s+به)\s+(?:في|لـ|ل|بمعدل)\s*/i,
];

function cleanClauseText(raw: string): string {
  let text = String(raw || '')
    .replace(/^[\s•●▪\-*—–\d.)]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const prefixRe of ARABIC_FILLER_PREFIXES) {
    const stripped = text.replace(prefixRe, '').trim();
    if (stripped.length >= 12) {
      text = stripped;
      break;
    }
  }

  return text.replace(/[\s،.;:]+$/, '').trim();
}

function truncateAtWordBoundary(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace >= Math.floor(maxChars * 0.55) ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s،.;:]+$/, '')}…`;
}

function splitRawClauses(items: string[] | undefined, fallbackText?: string): string[] {
  const sources = items && items.length > 0 ? items : fallbackText ? [fallbackText] : [];
  const clauses: string[] = [];

  for (const src of sources) {
    const parts = String(src || '')
      .split(/\r?\n|•|●|▪|؛|(?:\.\s+)/)
      .map(cleanClauseText)
      .filter((p) => p.length >= 4);
    for (const part of parts) {
      // Further split overly long comma-separated sentences so crisp facts can be picked cleanly
      if (part.length > 75 && part.includes('،')) {
        const subParts = part
          .split('،')
          .map(cleanClauseText)
          .filter((sp) => sp.length >= 6);
        if (subParts.length > 1) {
          clauses.push(...subParts);
          continue;
        }
      }
      clauses.push(part);
    }
  }

  // Deduplicate keeping highest-signal distinct points
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of clauses) {
    const norm = c.replace(/\s+/g, '').toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(c);
    }
  }
  return unique;
}

function pickBestCondensedItems(
  clauses: string[],
  maxItems: number,
  maxTotalChars: number,
  maxItemChars: number
): string[] {
  if (clauses.length === 0) return [];

  // Prefer informative clauses containing numbers, percentages, dosages, or target keywords
  const scored = clauses.map((text, index) => {
    let score = 0;
    if (/%|\d/.test(text)) score += 4;
    if (/فدان|لتر|سم|جم|كجم|ماء|رش|تسميد|مكافح|علاج|جذور|تزهير|عقد|حشر|فطر|عفن/.test(text)) {
      score += 3;
    }
    if (text.length >= 14 && text.length <= 65) score += 2;
    return { text, index, score };
  });

  const selected: Array<{ text: string; index: number }> = [];
  let runningChars = 0;

  // Keep top-scoring entries up to budget, then sort back to original logical order
  const orderedByPriority = [...scored].sort((a, b) => b.score - a.score || a.index - b.index);
  for (const candidate of orderedByPriority) {
    if (selected.length >= maxItems) break;
    const itemText = truncateAtWordBoundary(candidate.text, maxItemChars);
    if (selected.length > 0 && runningChars + itemText.length > maxTotalChars) {
      continue;
    }
    selected.push({ text: itemText, index: candidate.index });
    runningChars += itemText.length;
  }

  return selected.sort((a, b) => a.index - b.index).map((s) => s.text);
}

/** Total character footprint across a product's descriptive & technical fields. */
export function getProductSpecsLength(product: Product): number {
  const parts = [
    product.shortDescription || '',
    product.description || '',
    ...(product.characteristics || []),
    ...(product.composition || []),
    ...(product.usage || []),
  ];
  return parts.join(' ').trim().length;
}

/** True when a product's details are dense enough to benefit from condensation in client catalogs. */
export function isProductTextDense(product: Product): boolean {
  if (getProductSpecsLength(product) > 185) return true;
  const allBullets = [
    ...(product.characteristics || []),
    ...(product.composition || []),
    ...(product.usage || []),
  ];
  return allBullets.length > 5 || allBullets.some((b) => String(b).length > 85);
}

/** Deterministically distills a product's long technical text into crisp, clear catalog takeaways. */
export function buildSmartProductSummary(product: Product): ProductCatalogSummary {
  const descSource = product.shortDescription?.trim() || product.description?.trim() || '';

  const charClauses = splitRawClauses(product.characteristics, descSource);
  const characteristics = pickBestCondensedItems(charClauses, 3, 120, 62);

  const compClauses = splitRawClauses(product.composition);
  const composition = pickBestCondensedItems(compClauses, 2, 95, 58);

  const usageFallback = product.applicationRate ? [product.applicationRate] : [];
  const usageClauses = splitRawClauses(
    product.usage && product.usage.length > 0 ? product.usage : usageFallback
  );
  const usage = pickBestCondensedItems(usageClauses, 2, 100, 62);

  const rawDescClauses = splitRawClauses(
    descSource ? [descSource] : [],
    characteristics.join(' • ')
  );
  const shortSummary =
    rawDescClauses.length > 0
      ? truncateAtWordBoundary(rawDescClauses.slice(0, 2).join(' — '), 145)
      : truncateAtWordBoundary(characteristics.join(' • '), 145);

  return {
    shortSummary,
    characteristics,
    composition,
    usage,
  };
}

/** Resolves the effective display copy for a product under catalog-wide and per-product settings. */
export function resolveProductForCatalog(
  product: Product,
  globalMode: CatalogDetailMode,
  override?: ProductCatalogOverride
): Product {
  const effectiveMode = override?.mode ?? globalMode;
  if (effectiveMode === 'full') {
    return product;
  }

  const autoSummary = buildSmartProductSummary(product);
  const custom = override?.customSummary;

  const characteristics =
    custom?.characteristics && custom.characteristics.length > 0
      ? custom.characteristics
      : autoSummary.characteristics;
  const composition =
    custom?.composition && custom.composition.length > 0
      ? custom.composition
      : autoSummary.composition;
  const usage =
    custom?.usage && custom.usage.length > 0 ? custom.usage : autoSummary.usage;
  const shortSummary =
    custom?.shortSummary && custom.shortSummary.trim()
      ? custom.shortSummary.trim()
      : autoSummary.shortSummary;

  return {
    ...product,
    shortDescription: shortSummary || product.shortDescription,
    description: shortSummary || product.description,
    characteristics,
    composition,
    usage,
  };
}
