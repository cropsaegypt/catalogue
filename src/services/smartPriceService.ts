import * as XLSX from 'xlsx';
import { Product, Package, Company } from '../types';

export interface ExtractedPriceItem {
  rawText: string;
  rawName: string;
  rawPackage?: string;
  rawPrice: number;
}

export interface MatchedPriceProposal {
  id: string; // unique ID for UI row
  rawText: string;
  rawName: string;
  rawPackage?: string;
  rawPrice: number;
  // Matched Product info
  productId: string;
  productName: string;
  companyId: string;
  companyName: string;
  productImage?: string;
  // Matched Package info
  packageId: string;
  packageName: string;
  availablePackages: Package[];
  oldPrice: number;
  newPrice: number; // Editable in review table
  diff: number;
  diffPercent: number;
  costPrice?: number;
  isBelowCost: boolean;
  // Confidence
  confidence: 'high' | 'medium' | 'low' | 'unmatched';
  matchScore: number;
  selected: boolean;
}

/**
 * Converts Eastern Arabic numerals (٠-٩) to Western Arabic numerals (0-9).
 */
export function convertArabicNumbers(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => String(arabicDigits.indexOf(w)));
}

/**
 * Normalizes Arabic text for high-accuracy agronomic catalog matching.
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return convertArabicNumbers(text)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[\u0640]/g, '') // tatweel
    .replace(/[ي]/g, 'ي')
    .replace(/[\-_\/\(\)\[\],:;=*+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses free-form text lines (such as pasted from WhatsApp, email, or price lists).
 */
export function parsePriceText(rawText: string): ExtractedPriceItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean);
  const results: ExtractedPriceItem[] = [];

  // Common volume / package patterns (e.g. 1 لتر, 250 سم, 5 لتر, 1 كجم)
  const packageRegex =
    /(?:\b|\()(\d+(?:\.\d+)?\s*(?:لتر|مل|ملل|سم|سم٣|سم3|كجم|كيلو|جرام|جم|طن|قرص|باكت|شيكارة|جركن|أمبول|امبول))(?:\b|\))/i;

  for (const line of lines) {
    const cleanLine = convertArabicNumbers(line).trim();
    if (!cleanLine) continue;

    // 1. Detect package if mentioned in line
    let detectedPackage: string | undefined = undefined;
    const pkgMatch = cleanLine.match(packageRegex);
    if (pkgMatch) {
      detectedPackage = pkgMatch[1].trim();
    }

    // 2. Extract potential price numbers (ignoring percentages like 10% or 25%)
    // First mask out percentage numbers e.g. "10%" or "25%"
    const maskedLine = cleanLine.replace(/(\d+(?:\.\d+)?)\s*%/g, '___PCT___');

    // Extract numbers with optional decimal, ignoring percentages
    const numberMatches = Array.from(
      maskedLine.matchAll(/(?:سعر|بـ|ب|:|=-|=|-|\b)?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:جنيه|جنية|ج|EGP|LE|le|egp|L\.E)?(?:\b|$)/gi)
    );

    let price = 0;
    let priceToken = '';

    // Find the most appropriate number candidate for price
    for (let i = numberMatches.length - 1; i >= 0; i--) {
      const candidateStr = (numberMatches[i][1] || '').replace(',', '.');
      const candidateNum = parseFloat(candidateStr);
      // Reasonable agricultural product price threshold (e.g. 5 to 500,000 EGP)
      if (candidateNum > 0 && candidateNum < 1_000_000) {
        price = candidateNum;
        priceToken = numberMatches[i][0];
        break;
      }
    }

    if (price <= 0) continue;

    // 3. Extract the product name by removing the price and currency tokens
    let namePart = cleanLine;
    if (priceToken) {
      namePart = namePart.replace(priceToken, ' ');
    }
    // Clean out noise words
    namePart = namePart
      .replace(/(?:سعر|اسعار|صنف|المنتج|منتج|بـ|جنيه|جنية|\bج\b|EGP|LE|le|egp|\:|\-|\=)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (namePart.length >= 2) {
      results.push({
        rawText: line,
        rawName: namePart,
        rawPackage: detectedPackage,
        rawPrice: price,
      });
    }
  }

  return results;
}

/**
 * Parses an Excel or CSV file to extract product names, prices, and optional package info.
 */
export async function parseExcelOrCsvFile(file: File): Promise<ExtractedPriceItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to array of arrays
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (rawRows.length === 0) return [];

  // Determine header row (usually first non-empty row)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    const row = rawRows[i];
    if (
      row.some(
        (cell: any) =>
          typeof cell === 'string' &&
          /اسم|منتج|صنف|سعر|price|product|name|عبوة|حجم|package/i.test(cell)
      )
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex] || [];
  let nameColIdx = -1;
  let priceColIdx = -1;
  let packageColIdx = -1;

  headerRow.forEach((cell: any, idx: number) => {
    const str = String(cell || '').trim().toLowerCase();
    if (/اسم|منتج|صنف|product|name/i.test(str) && nameColIdx === -1) {
      nameColIdx = idx;
    } else if (/سعر|price|cost|مبلغ/i.test(str) && priceColIdx === -1) {
      priceColIdx = idx;
    } else if (/عبوة|حجم|سعة|وحدة|package|size|unit/i.test(str) && packageColIdx === -1) {
      packageColIdx = idx;
    }
  });

  // Fallback: If headers didn't match, infer from data
  if (nameColIdx === -1 || priceColIdx === -1) {
    const sampleRow = rawRows[headerRowIndex + 1] || rawRows[0];
    sampleRow.forEach((cell: any, idx: number) => {
      const val = String(cell || '').trim();
      const num = parseFloat(val.replace(/[^\d.]/g, ''));
      if (!isNaN(num) && num > 0 && priceColIdx === -1) {
        priceColIdx = idx;
      } else if (val.length > 2 && isNaN(Number(val)) && nameColIdx === -1) {
        nameColIdx = idx;
      }
    });
  }

  if (nameColIdx === -1 || priceColIdx === -1) {
    nameColIdx = 0;
    priceColIdx = 1;
  }

  const results: ExtractedPriceItem[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawNameCell = String(row[nameColIdx] || '').trim();
    const rawPriceCell = String(row[priceColIdx] || '').trim();
    const rawPackageCell = packageColIdx !== -1 ? String(row[packageColIdx] || '').trim() : '';

    if (!rawNameCell) continue;

    const cleanNum = parseFloat(convertArabicNumbers(rawPriceCell).replace(/[^\d.]/g, ''));
    if (isNaN(cleanNum) || cleanNum <= 0) continue;

    results.push({
      rawText: `${rawNameCell} - ${cleanNum}`,
      rawName: rawNameCell,
      rawPackage: rawPackageCell || undefined,
      rawPrice: cleanNum,
    });
  }

  return results;
}

/**
 * String similarity score based on character bigrams and token overlap.
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0;

  const aTokens = a.split(' ').filter(Boolean);
  const bTokens = b.split(' ').filter(Boolean);

  let commonTokens = 0;
  for (const t of aTokens) {
    if (bTokens.includes(t)) commonTokens++;
  }

  const tokenScore = (2 * commonTokens) / (aTokens.length + bTokens.length);

  // Bigram character match
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.slice(i, i + 2));
    }
    return bigrams;
  };

  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);

  let intersection = 0;
  for (const bg of aBigrams) {
    if (bBigrams.has(bg)) intersection++;
  }

  const bigramScore =
    aBigrams.size + bBigrams.size > 0
      ? (2 * intersection) / (aBigrams.size + bBigrams.size)
      : 0;

  return 0.6 * tokenScore + 0.4 * bigramScore;
}

/**
 * Matches extracted price items with catalog products and packages.
 */
export function matchExtractedItemsWithCatalog(
  extractedItems: ExtractedPriceItem[],
  products: Product[],
  packages: Package[],
  companies: Company[]
): MatchedPriceProposal[] {
  const compMap = new Map(companies.map((c) => [c.id, c.name]));
  const proposals: MatchedPriceProposal[] = [];

  // Group packages by product ID
  const packagesByProduct = new Map<string, Package[]>();
  for (const pkg of packages) {
    const list = packagesByProduct.get(pkg.productId) || [];
    list.push(pkg);
    packagesByProduct.set(pkg.productId, list);
  }

  // Pre-normalize catalog products
  const normalizedProducts = products.map((p) => ({
    product: p,
    normName: normalizeArabic(p.name),
    normId: p.id.toLowerCase(),
  }));

  for (let idx = 0; idx < extractedItems.length; idx++) {
    const item = extractedItems[idx];
    const normRawName = normalizeArabic(item.rawName);

    let bestScore = 0;
    let matchedProduct: Product | null = null;

    // Search for closest product match
    for (const np of normalizedProducts) {
      let score = 0;

      // Exact ID or exact Name match
      if (np.normId === normRawName || np.normName === normRawName) {
        score = 1.0;
      }
      // Substring match
      else if (np.normName.includes(normRawName) || normRawName.includes(np.normName)) {
        score = 0.88;
      }
      // Similarity calculation
      else {
        score = calculateSimilarity(normRawName, np.normName);
      }

      if (score > bestScore) {
        bestScore = score;
        matchedProduct = np.product;
      }
    }

    const availablePkgs = matchedProduct ? packagesByProduct.get(matchedProduct.id) || [] : [];

    // Find best matching package
    let targetPkg: Package | null = null;

    if (availablePkgs.length > 0) {
      if (item.rawPackage) {
        const normRawPkg = normalizeArabic(item.rawPackage);
        targetPkg =
          availablePkgs.find((p) => {
            const normPName = normalizeArabic(p.displayName);
            return normPName.includes(normRawPkg) || normRawPkg.includes(normPName);
          }) || null;
      }

      // Default to 1st package if not specifically matched
      if (!targetPkg) {
        // Prefer 1L / 1Kg package if available
        targetPkg =
          availablePkgs.find((p) => p.quantity === 1) || availablePkgs[0];
      }
    }

    const companyName = matchedProduct
      ? compMap.get(matchedProduct.companyId) || 'شركة زراعية'
      : 'غير معروف';

    const oldPrice = targetPkg ? targetPkg.price : 0;
    const newPrice = item.rawPrice;
    const diff = newPrice - oldPrice;
    const diffPercent = oldPrice > 0 ? (diff / oldPrice) * 100 : 0;
    const costPrice = targetPkg?.costPrice || 0;
    const isBelowCost = costPrice > 0 && newPrice < costPrice;

    let confidence: 'high' | 'medium' | 'low' | 'unmatched' = 'unmatched';
    if (bestScore >= 0.75) confidence = 'high';
    else if (bestScore >= 0.5) confidence = 'medium';
    else if (bestScore >= 0.35) confidence = 'low';

    proposals.push({
      id: `prop-${idx}-${Date.now()}`,
      rawText: item.rawText,
      rawName: item.rawName,
      rawPackage: item.rawPackage,
      rawPrice: item.rawPrice,
      productId: matchedProduct ? matchedProduct.id : '',
      productName: matchedProduct ? matchedProduct.name : item.rawName,
      companyId: matchedProduct ? matchedProduct.companyId : '',
      companyName,
      productImage: matchedProduct?.mainImageUrl,
      packageId: targetPkg ? targetPkg.id : '',
      packageName: targetPkg ? targetPkg.displayName : (item.rawPackage || 'عبوة افتراضية'),
      availablePackages: availablePkgs,
      oldPrice,
      newPrice,
      diff,
      diffPercent,
      costPrice,
      isBelowCost,
      confidence,
      matchScore: bestScore,
      selected: confidence === 'high' || confidence === 'medium',
    });
  }

  return proposals;
}

/**
 * Calls backend Gemini AI endpoint to extract price items from images or PDF documents.
 */
export async function extractPricesWithAi(
  fileDataUrl: string,
  fileName: string,
  customApiKey?: string
): Promise<ExtractedPriceItem[]> {
  const res = await fetch('/api/gemini/extract-price-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileDataUrl,
      fileName,
      customApiKey: customApiKey || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `فشل استخراج الأسعار بالذكاء الاصطناعي (رمز ${res.status})`);
  }

  const data = await res.json();
  const items: any[] = data.items || [];

  return items.map((it: any) => ({
    rawText: `${it.name || ''} - ${it.price || 0}`,
    rawName: String(it.name || '').trim(),
    rawPackage: it.package ? String(it.package).trim() : undefined,
    rawPrice: Number(it.price) || 0,
  }));
}
