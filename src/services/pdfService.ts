import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Product, Package, Category, Company, CatalogSettings, Advertisement } from '../types';
import { FALLBACK_BOTTLE_SVG_DATA_URL } from '../utils/agriculturalImages';

export interface PdfGeneratorOptions {
  category?: Category | null;
  company?: Company | null;
  products: Product[];
  packagesMap: Record<string, Package[]>;
  settings: CatalogSettings;
  advertisements?: Advertisement[];
  productsPerPage: number;
  showPrices: boolean;
  showCharacteristics: boolean;
  showComposition: boolean;
  showUsage: boolean;
  showAdvertisements: boolean;
  showProductIds: boolean;
}

export interface RenderedCatalogImage {
  pageNumber: number;
  dataUrl: string;
  filename: string;
}

// In-memory cache for preloaded base64 images so multi-page catalogs don't refetch the same logo/product
const imageBase64Cache = new Map<string, string>();

/**
 * Safely converts an image URL to a clean Data URL.
 * Bypasses CORS taint by fetching as blob or drawing through an untainted canvas.
 * Falls back to null if unreachable or blocked.
 */
async function convertImageToDataUrl(url: string, timeoutMs: number = 5000): Promise<string | null> {
  if (!url || !url.trim()) return null;
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith('data:')) return cleanUrl;

  const cached = imageBase64Cache.get(cleanUrl);
  if (cached) return cached;

  // 1. Fetch as blob (handles CORS-enabled servers including CDNs, Unsplash, Firebase)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(cleanUrl, { mode: 'cors', signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader returned non-string'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (base64) {
        imageBase64Cache.set(cleanUrl, base64);
        return base64;
      }
    }
  } catch {
    // Fetch failed or blocked by CORS
  }

  // 2. Offscreen Image element with anonymous CORS
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          reject(new Error('Image load timeout'));
        }
      }, timeoutMs);

      img.onload = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || img.width || 300;
          c.height = img.naturalHeight || img.height || 300;
          const ctx = c.getContext('2d');
          if (!ctx) {
            reject(new Error('No 2d context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(e);
      };
      img.src = cleanUrl;
    });

    if (base64) {
      imageBase64Cache.set(cleanUrl, base64);
      return base64;
    }
  } catch {
    // Canvas taint or image load failed
  }

  return null;
}

/**
 * Converts a data URL to a binary Blob for fail-safe, memory-efficient browser downloads.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  if (parts.length < 2) {
    const mimeMatch = dataUrl.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    return new Blob([dataUrl], { type: mime });
  }
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Clones a page element into a dedicated off-screen sandbox at (0, 0),
 * replaces all cross-origin images with local data URLs (or clean SVG fallbacks),
 * and captures high-resolution canvas with html2canvas.
 */
async function renderPageElementToJpeg(element: HTMLElement, quality: number = 0.92): Promise<string> {
  // 1. Create dedicated isolated sandbox attached to document.body
  const sandbox = document.createElement('div');
  sandbox.setAttribute('data-pdf-sandbox', 'true');
  sandbox.style.position = 'fixed';
  sandbox.style.top = '0';
  sandbox.style.left = '0';
  sandbox.style.width = '794px';
  sandbox.style.height = '1123px';
  sandbox.style.zIndex = '-99999';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.overflow = 'hidden';
  sandbox.style.backgroundColor = '#ffffff';

  // 2. Clone page node deeply and ensure crisp A4 geometry
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'relative';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.width = '794px';
  clone.style.height = '1123px';
  clone.style.boxSizing = 'border-box';

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // 3. Pre-convert all images in clone to local data URLs to avoid CORS taint
    const images = Array.from(clone.querySelectorAll('img'));
    await Promise.all(
      images.map(async (img) => {
        const src = img.getAttribute('src');
        if (!src) return;
        if (src.startsWith('data:')) return;

        try {
          const dataUrl = await convertImageToDataUrl(src, 5000);
          if (dataUrl) {
            img.src = dataUrl;
          } else {
            // Replace blocked image with agricultural bottle fallback SVG
            img.src = FALLBACK_BOTTLE_SVG_DATA_URL;
          }
        } catch {
          img.src = FALLBACK_BOTTLE_SVG_DATA_URL;
        }

        // Wait for image decode if supported
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            // decode error ignored
          }
        }
      })
    );

    // Brief layout settle tick
    await new Promise((r) => setTimeout(r, 60));

    // 4. Render with html2canvas (allowTaint must be FALSE to allow canvas.toDataURL!)
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        imageTimeout: 10000,
      });
    } catch (errScale2) {
      console.warn('html2canvas scale:2 failed, falling back to scale:1.5', errScale2);
      canvas = await html2canvas(clone, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        x: 0,
        y: 0,
      });
    }

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    // 5. Clean up sandbox from DOM
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
}

export const pdfService = {
  chunkProducts(products: Product[], perPage: number): Product[][] {
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += perPage) {
      chunks.push(products.slice(i, i + perPage));
    }
    return chunks;
  },

  printCatalog(): void {
    window.print();
  },

  downloadImageDataUrl(dataUrl: string, filename: string): void {
    try {
      const blob = dataUrlToBlob(dataUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      }, 500);
    } catch {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 500);
    }
  },

  async generateImagesFromPages(
    pageElements: HTMLElement[],
    baseFilePrefix: string = 'CROPSA_Catalog',
    onProgress?: (percent: number) => void
  ): Promise<RenderedCatalogImage[]> {
    if (!pageElements || pageElements.length === 0) {
      throw new Error('لا توجد صفحات متاحة لتحويلها إلى صور');
    }

    const total = pageElements.length;
    const results: RenderedCatalogImage[] = [];

    for (let i = 0; i < total; i++) {
      if (onProgress) {
        onProgress(Math.round(((i + 1) / total) * 100));
      }
      const dataUrl = await renderPageElementToJpeg(pageElements[i], 0.94);
      const pageNumStr = String(i + 1).padStart(2, '0');
      results.push({
        pageNumber: i + 1,
        dataUrl,
        filename: `${baseFilePrefix}_Page_${pageNumStr}.jpg`,
      });
    }

    return results;
  },

  async generatePdfFromPages(
    pageElements: HTMLElement[],
    filename: string = 'CROPSA_Catalog.pdf',
    onProgress?: (percent: number) => void
  ): Promise<void> {
    if (!pageElements || pageElements.length === 0) {
      throw new Error('لا توجد صفحات متاحة للتصدير');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const totalPages = pageElements.length;

    for (let i = 0; i < totalPages; i++) {
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalPages) * 100));
      }

      const imgData = await renderPageElementToJpeg(pageElements[i], 0.92);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    pdf.save(filename);
  },
};
