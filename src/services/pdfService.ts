import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Product, Package, Category, Company, CatalogSettings, Advertisement } from '../types';

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

async function renderPageElementToJpeg(element: HTMLElement, quality: number = 0.92): Promise<string> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 794,
  });
  return canvas.toDataURL('image/jpeg', quality);
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
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
