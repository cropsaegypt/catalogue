import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker for pdfjs
try {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('Could not set pdfjs worker url:', e);
}

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  hasText: boolean;
  pageTexts: Record<number, string>;
  pageSummaries: { pageNum: number; snippet: string }[];
}

export interface PdfPageImage {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
}

export const pdfHelper = {
  /**
   * Extract all embedded text from a PDF file directly in the browser
   */
  async extractText(file: File, maxPages = 40): Promise<PdfExtractionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const pagesToExtract = Math.min(totalPages, maxPages);

      let fullText = '';
      const pageTexts: Record<number, string> = {};
      const pageSummaries: { pageNum: number; snippet: string }[] = [];

      for (let i = 1; i <= pagesToExtract; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageStrings = textContent.items
          .map((item: any) => (item && 'str' in item ? item.str : ''))
          .filter((s: string) => s.trim().length > 0);

        const pageText = pageStrings.join(' ');
        
        if (pageText.trim().length > 0) {
          pageTexts[i] = pageText;
          fullText += `\n--- [صفحة ${i} من الكتالوج] ---\n` + pageText + '\n';
          pageSummaries.push({
            pageNum: i,
            snippet: pageText.slice(0, 150) + (pageText.length > 150 ? '...' : ''),
          });
        }
      }

      const cleanText = fullText.trim();
      const hasMeaningfulText = cleanText.replace(/[\s\-_[\]]/g, '').length > 80;

      return {
        text: cleanText,
        pageCount: totalPages,
        hasText: hasMeaningfulText,
        pageTexts,
        pageSummaries,
      };
    } catch (err) {
      console.warn('Failed to extract text using pdfjs:', err);
      return {
        text: '',
        pageCount: 0,
        hasText: false,
        pageTexts: {},
        pageSummaries: [],
      };
    }
  },

  /**
   * Render PDF pages to compressed JPEG images on the client side
   */
  async renderPagesToImages(
    file: File,
    startPage = 1,
    maxPages = 8,
    maxDimension = 1300,
    quality = 0.75
  ): Promise<PdfPageImage[]> {
    const images: PdfPageImage[] = [];

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });

      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      const endPage = Math.min(totalPages, startPage + maxPages - 1);

      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        // Calculate scale to fit within maxDimension
        const maxCurrentDim = Math.max(unscaledViewport.width, unscaledViewport.height);
        const scale = maxCurrentDim > maxDimension ? maxDimension / maxCurrentDim : 1.2;

        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({
          canvasContext: ctx,
          viewport: viewport,
        }).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        images.push({
          pageNum,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      }
    } catch (err) {
      console.error('Error rendering PDF pages to images:', err);
    }

    return images;
  },
};
