import { ExtractedProductItem, ExtractedPackage, Category } from '../types';
import { getAgriculturalProductImage } from '../utils/agriculturalImages';
import { uploadDataUrlToFirebaseStorage } from './firebase';

export interface CatalogExtractionRequest {
  companyName: string;
  existingCategories: string[];
  files?: Array<{ data: string; mimeType: string; name?: string; pageText?: string }>;
  fileData?: string;
  mimeType?: string;
  pastedText?: string;
  additionalNotes?: string;
  customApiKey?: string;
  onProgress?: (msg: string) => void;
}

export interface CatalogExtractionResult {
  catalogTitle?: string;
  companyName?: string;
  catalogYear?: string;
  currency?: string;
  notes?: string;
  products: ExtractedProductItem[];
}

export const aiCatalogService = {
  /**
   * Convert a File object to base64 string with smart image optimization
   */
  async fileToBase64(file: File): Promise<string> {
    if (file.type.startsWith('image/')) {
      return this.compressImage(file);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Resize high-resolution smartphone catalog photos to prevent HTTP 413 Payload Too Large
   */
  async compressImage(file: File, maxDimension = 1300, quality = 0.75): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (!rawResult) {
          resolve('');
          return;
        }

        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
            return;
          }
          resolve(rawResult);
        };
        img.onerror = () => {
          resolve(rawResult);
        };
        img.src = rawResult;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Crop a specific product packaging image from a catalog page/photo using normalized 0..1000 bounding box
   */
  async cropProductImageFromSource(
    sourceDataUrl: string,
    box: { ymin: number; xmin: number; ymax: number; xmax: number }
  ): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) {
            resolve(null);
            return;
          }

          // Add 2.5% breathing margin around box so caps/labels aren't clipped
          const pad = 25;
          const ymin = Math.max(0, Math.min(1000, Number(box.ymin) - pad));
          const xmin = Math.max(0, Math.min(1000, Number(box.xmin) - pad));
          const ymax = Math.max(0, Math.min(1000, Number(box.ymax) + pad));
          const xmax = Math.max(0, Math.min(1000, Number(box.xmax) + pad));

          const sx = Math.floor((xmin / 1000) * w);
          const sy = Math.floor((ymin / 1000) * h);
          const sw = Math.max(20, Math.floor(((xmax - xmin) / 1000) * w));
          const sh = Math.max(20, Math.floor(((ymax - ymin) / 1000) * h));

          const maxOut = 560;
          const scale = Math.min(1, maxOut / Math.max(sw, sh));
          const outW = Math.max(40, Math.round(sw * scale));
          const outH = Math.max(40, Math.round(sh * scale));

          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, outW, outH);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = () => resolve(null);
        img.src = sourceDataUrl;
      } catch {
        resolve(null);
      }
    });
  },

  /**
   * Persist extracted image on backend disk so localStorage never hits 5MB quota
   */
  async uploadExtractedImage(dataUrl: string, fileNamePrefix = 'ai-prd'): Promise<string> {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }

    // 1. Prefer Firebase Storage URL so images persist across Vercel & all mobile devices
    const firebaseUrl = await uploadDataUrlToFirebaseStorage(dataUrl, 'cropsa-images', fileNamePrefix);
    if (firebaseUrl) {
      return firebaseUrl;
    }

    // 2. Fallback to backend endpoint (disk locally, compressed inline on Vercel read-only FS)
    try {
      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, fileName: fileNamePrefix }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.url) {
          return json.url;
        }
      }
    } catch {
      // Fallback to dataUrl
    }
    return dataUrl;
  },

  /**
   * Internal single batch request
   */
  async _sendSingleBatch(
    params: CatalogExtractionRequest,
    categories: Category[]
  ): Promise<CatalogExtractionResult> {
    const categoryNames = categories.map((c) => c.name);

    let response: Response;
    try {
      response = await fetch('/api/gemini/extract-catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: params.companyName,
          existingCategories: categoryNames,
          files: params.files || [],
          fileData: params.fileData,
          mimeType: params.mimeType,
          pastedText: params.pastedText,
          additionalNotes: params.additionalNotes,
          customApiKey: params.customApiKey,
        }),
      });
    } catch (networkErr: any) {
      console.error('Fetch network error:', networkErr);
      throw new Error(
        'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت أو تقليل عدد الملفات المرفوعة.'
      );
    }

    if (!response.ok) {
      let errMsg = 'فشل الاتصال بخدمة الذكاء الاصطناعي لاستخراج الكتالوج';
      try {
        const text = await response.text();
        try {
          const errJson = JSON.parse(text);
          if (errJson.error) {
            errMsg = errJson.error;
          }
        } catch {
          if (response.status === 413) {
            errMsg = 'حجم الملفات المرفوعة كبير جداً بالنسبة للطلب الواحد. تم تفعيل نظام المعالجة بالدفعات لتفادي هذا الخطأ.';
          } else if (response.status === 504 || response.status === 502) {
            errMsg = 'استغرقت معالجة الكتالوج وقتاً طويلاً. يرجى إعادة المحاولة بالدفعات أو تجزئة الصفحات.';
          } else {
            errMsg = `خطأ في استجابة الخادم (${response.status}): ${text.slice(0, 120)}`;
          }
        }
      } catch {
        // use default message
      }
      throw new Error(errMsg);
    }

    const resJson = await response.json();
    if (!resJson.success || !resJson.data) {
      throw new Error(resJson.error || 'تعذر قراءة أو استخراج البيانات من الملف المرفوع');
    }

    const raw = resJson.data;
    const rawProducts = raw.products || [];
    const batchFiles = params.files || [];

    // Map extracted products & crop real product photos from catalog pages/images
    const products: ExtractedProductItem[] = await Promise.all(
      rawProducts.map(async (p: any, idx: number) => {
        const matchedCat = categories.find(
          (c) =>
            c.name.toLowerCase().includes(p.categoryName?.toLowerCase() || '') ||
            (p.categoryName || '').toLowerCase().includes(c.name.toLowerCase())
        );

        const packages: ExtractedPackage[] = (p.packages || []).map((pkg: any, pIdx: number) => ({
          id: `PKG-EXT-${Date.now()}-${idx}-${pIdx}`,
          displayName: pkg.displayName || `${pkg.quantity || 1} ${pkg.unit || 'لتر'}`,
          quantity: Number(pkg.quantity) || 1,
          unit: pkg.unit || 'لتر',
          price: Number(pkg.price) || 0,
          piecesPerCarton:
            Number(pkg.piecesPerCarton) ||
            (pkg.unit?.includes('كجم') || pkg.unit?.includes('لتر') ? 12 : 24),
        }));

        const fullText = `${p.name || ''} ${p.shortDescription || ''} ${p.description || ''} ${(p.usage || []).join(' ')} ${(p.characteristics || []).join(' ')} ${p.categoryName || ''}`;
        const isPestControl = /مكافح|علاج|مبيد|حشائش|فطر|حشر|دودة|توتا|أكاروس|نيماتود|عفن|ذبابة|من|تربس/.test(fullText);

        let computedType: 'fertilizer' | 'stimulant' | 'pesticide' | 'seeds' | 'other';
        if (isPestControl) {
          computedType = 'pesticide';
        } else {
          const hasPowder = packages.some((pkg) =>
            /كجم|جم|جرام|كيلو|بودر|مسحوق|شيكارة/.test(pkg.unit + ' ' + pkg.displayName)
          );
          const hasLiquid = packages.some((pkg) =>
            /لتر|مل|سم|سائل|جالون/.test(pkg.unit + ' ' + pkg.displayName)
          );
          if (hasLiquid && !hasPowder) {
            computedType = 'stimulant';
          } else if (hasPowder) {
            computedType = 'fertilizer';
          } else {
            computedType = (p.productType as any) || 'fertilizer';
          }
        }

        const assignedCategoryName =
          p.categoryName ||
          (computedType === 'pesticide'
            ? 'مبيدات آفات وحشائش'
            : computedType === 'stimulant'
            ? 'المغذيات والمخصبات الحيوية'
            : 'الأسمدة الورقية والمتخصصة');

        // Extract REAL product image from catalog page/photo when available
        let finalImageUrl = '';
        let extractedFromCatalogImage = false;

        const sourceIdx =
          typeof p.sourceImageIndex === 'number' &&
          p.sourceImageIndex >= 0 &&
          p.sourceImageIndex < batchFiles.length
            ? p.sourceImageIndex
            : batchFiles.length === 1
            ? 0
            : -1;

        if (sourceIdx >= 0 && batchFiles[sourceIdx]?.data) {
          const sourceDataUrl = batchFiles[sourceIdx].data;
          const box = p.imageBox;
          if (
            box &&
            typeof box.xmax === 'number' &&
            typeof box.xmin === 'number' &&
            typeof box.ymax === 'number' &&
            typeof box.ymin === 'number' &&
            box.xmax > box.xmin + 15 &&
            box.ymax > box.ymin + 15
          ) {
            const croppedDataUrl = await this.cropProductImageFromSource(sourceDataUrl, box);
            if (croppedDataUrl) {
              finalImageUrl = await this.uploadExtractedImage(croppedDataUrl, `prd-${idx}`);
              extractedFromCatalogImage = true;
            }
          } else if (batchFiles.length === 1 && rawProducts.length === 1) {
            // Single product image uploaded directly
            finalImageUrl = await this.uploadExtractedImage(sourceDataUrl, `prd-${idx}`);
            extractedFromCatalogImage = true;
          }
        }

        if (!finalImageUrl) {
          finalImageUrl = getAgriculturalProductImage(p.name, assignedCategoryName);
        }

        return {
          id: `EXT-PRD-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: p.name || `مركب زراعي رقم ${idx + 1}`,
          productType: computedType,
          categoryName: assignedCategoryName,
          categoryId: matchedCat?.id || categories[0]?.id || '',
          shortDescription:
            p.shortDescription ||
            (computedType === 'pesticide'
              ? 'مبيد عالي الفاعلية لمكافحة الآفات'
              : computedType === 'stimulant'
              ? 'مخصب سائل سريع الامتصاص والتحجيم'
              : 'سماد بودر عالي النقاوة والتسميد'),
          description: p.description || '',
          characteristics: Array.isArray(p.characteristics) ? p.characteristics : [],
          composition: Array.isArray(p.composition) ? p.composition : [],
          usage: Array.isArray(p.usage) ? p.usage : [],
          applicationRate: p.applicationRate || '',
          imageHint: p.imageHint || '',
          imageUrl: finalImageUrl,
          extractedFromCatalogImage,
          packages:
            packages.length > 0
              ? packages
              : [
                  {
                    displayName: computedType === 'fertilizer' ? '1 كجم' : '1 لتر',
                    quantity: 1,
                    unit: computedType === 'fertilizer' ? 'كجم' : 'لتر',
                    price: 150,
                    piecesPerCarton: 12,
                  },
                ],
          selectedForImport: true,
        };
      })
    );

    return {
      catalogTitle: raw.catalogTitle || 'كتالوج المنتجات والأسعار',
      companyName: raw.companyName || params.companyName,
      catalogYear: raw.catalogYear || new Date().getFullYear().toString(),
      currency: raw.currency || 'جنيه مصري',
      notes: raw.notes || '',
      products,
    };
  },

  /**
   * Main entry point with intelligent batching to prevent HTTP 413
   */
  async extractCatalog(
    params: CatalogExtractionRequest,
    categories: Category[]
  ): Promise<CatalogExtractionResult> {
    const rawFiles = params.files || [];
    const MAX_FILES_PER_BATCH = 2;

    // If multiple files are uploaded, batch them to guarantee staying well under the 32MB reverse proxy limit
    if (rawFiles.length > MAX_FILES_PER_BATCH) {
      console.log(`[CROPSA Batching] Splitting ${rawFiles.length} files into batches of ${MAX_FILES_PER_BATCH}...`);
      const batches: Array<typeof rawFiles> = [];
      for (let i = 0; i < rawFiles.length; i += MAX_FILES_PER_BATCH) {
        batches.push(rawFiles.slice(i, i + MAX_FILES_PER_BATCH));
      }

      const allExtractedProducts: ExtractedProductItem[] = [];
      let finalCatalogTitle = '';
      let finalNotes = '';

      for (let bIdx = 0; bIdx < batches.length; bIdx++) {
        const batchFiles = batches[bIdx];
        const progressMsg = `جاري استخراج بيانات الصفحات: دفعة (${bIdx + 1} من ${batches.length})...`;
        params.onProgress?.(progressMsg);

        const batchResult = await this._sendSingleBatch(
          {
            ...params,
            files: batchFiles,
            pastedText: bIdx === 0 ? params.pastedText : undefined,
          },
          categories
        );

        if (!finalCatalogTitle && batchResult.catalogTitle) {
          finalCatalogTitle = batchResult.catalogTitle;
        }
        if (batchResult.notes) {
          finalNotes += (finalNotes ? ' | ' : '') + batchResult.notes;
        }

        for (const newProd of batchResult.products) {
          const normName = newProd.name.trim().toLowerCase();
          const existing = allExtractedProducts.find(
            (p) => p.name.trim().toLowerCase() === normName
          );

          if (existing) {
            if (!existing.extractedFromCatalogImage && newProd.extractedFromCatalogImage && newProd.imageUrl) {
              existing.imageUrl = newProd.imageUrl;
              existing.extractedFromCatalogImage = true;
            }
            for (const pkg of newProd.packages) {
              const hasPkg = existing.packages.some(
                (ep) => ep.displayName.trim() === pkg.displayName.trim()
              );
              if (!hasPkg) {
                existing.packages.push(pkg);
              }
            }
            existing.characteristics = Array.from(
              new Set([...existing.characteristics, ...newProd.characteristics])
            );
          } else {
            allExtractedProducts.push(newProd);
          }
        }
      }

      return {
        catalogTitle: finalCatalogTitle || `${params.companyName} - كتالوج المنتجات الزراعية`,
        companyName: params.companyName,
        catalogYear: new Date().getFullYear().toString(),
        currency: 'جنيه مصري',
        notes: finalNotes || 'تم استخراج كافة المنتجات وتجميعها بنجاح بالدفعات الذكية.',
        products: allExtractedProducts,
      };
    }

    return this._sendSingleBatch(params, categories);
  },

  /**
   * Pre-configured realistic agricultural catalog sample for instant testing
   */
  getSampleCatalogData(companyName: string, categories: Category[]): CatalogExtractionResult {
    const catFertilizer = categories.find((c) => c.name.includes('أسمدة') || c.name.includes('مخصبات'))?.id || categories[0]?.id || '';
    const catFungicide = categories.find((c) => c.name.includes('فطرية'))?.id || categories[1]?.id || categories[0]?.id || '';
    const catInsecticide = categories.find((c) => c.name.includes('حشرية'))?.id || categories[2]?.id || categories[0]?.id || '';
    const catGrowth = categories.find((c) => c.name.includes('نمو'))?.id || categories[0]?.id || '';

    return {
      catalogTitle: `كتالوج ومنتجات ${companyName} المعتمد للأسعار والمواصفات`,
      companyName,
      catalogYear: '2024 / 2025',
      currency: 'جنيه مصري (EGP)',
      notes: 'تم استخراج البيانات والأسعار الرسمية من الكتالوج القديم ومطابقتها لمواصفات وزارة الزراعة المصرية.',
      products: [
        {
          id: `EXT-PRD-${Date.now()}-1`,
          name: 'كروبسا ماكس بوتاسيوم 50%',
          categoryName: 'أسمدة ورقية ومخصبات',
          categoryId: catFertilizer,
          shortDescription: 'مركب بوتاسي نقي فائق الجودة مخلب على أحماض كربوكسيلية لزيادة التحجيم وتلوين الثمار ورفع نسبة السكريات.',
          description: 'سماد عالي البوتاسيوم خالي تماماً من الكلوريدات والصوديوم، يمتص بسرعة فائقة خلال أنسجة الأوراق لتلبية الاحتياجات العالية للنبات في مرحلة التزهير وعقد ونضج الثمار.',
          characteristics: [
            'سريع الامتصاص والانتقال داخل أوعية النبات',
            'يعالج أعراض نقص عنصر البوتاسيوم الفسيولوجية',
            'يرفع صلابة الثمار ويطيل فترة التخزين والتصدير',
            'خالي تماماً من الشوائب والكلور والصوديوم',
          ],
          composition: [
            'أكسيد بوتاسيوم K2O: 50%',
            'كبريت ذائب S: 18%',
            'نيتروجين كلي N: 3%',
            'أحماض كربوكسيلية منشطة: 5%',
          ],
          usage: [
            'محاصيل الخضر (طماطم، بطاطس، فلفل): 200 - 300 سم / 100 لتر ماء',
            'أشجار الفاكهة (موالح، عنب، مانجو): 2.5 - 3 لتر / فدان مع ماء الري',
            'المحاصيل الحقلية: 1.5 لتر / فدان رشاً بعد العقد',
          ],
          applicationRate: '200 سم / 100 لتر ماء رشاً أو 2.5 لتر / فدان تسميداً',
          imageHint: 'جركن أبيض سعة 5 لتر وزجاجة لتر بلاستيكية شيلك أزرق وذهبي',
          imageUrl: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=600&auto=format&fit=crop&q=80',
          packages: [
            { id: 'PKG-1-1L', displayName: '1 لتر', quantity: 1, unit: 'لتر', price: 420, piecesPerCarton: 12 },
            { id: 'PKG-1-5L', displayName: '5 لتر', quantity: 5, unit: 'لتر', price: 1950, piecesPerCarton: 4 },
            { id: 'PKG-1-20L', displayName: '20 لتر', quantity: 20, unit: 'لتر', price: 7200, piecesPerCarton: 1 },
          ],
          selectedForImport: true,
        },
        {
          id: `EXT-PRD-${Date.now()}-2`,
          name: 'كابرو فايتر 50% نحاس فوسفايت',
          categoryName: 'مبيدات فطرية ومطهرات',
          categoryId: catFungicide,
          shortDescription: 'مبيد فطري جهازي ذو اتجاهين صاعد وهابط لمكافحة أمراض البياض الزغبي والندوة المتأخرة واللفحات وعفن الجذور.',
          description: 'مركب ذو فاعلية مزدوجة يجمع بين قوة النحاس وتأثير الفوسفايت الذي يحفز المناعة الذاتية للنبات ضد الفطريات والبكتيريا الممرضة.',
          characteristics: [
            'جهازية كاملة صاعدة وهابطة داخل اللحاء والخشب',
            'يحفز تكوين الفيتوالكسينات المناعية في خلايا النبات',
            'فعالية وقائية وعلاجية ممتدة المفعول',
            'أمان عالي على البيئة ولا يترك ترسبات سامة',
          ],
          composition: [
            'فوسفايت النحاس: 50%',
            'نحاس معدني خالص: 24%',
            'فوسفور متاح P2O5: 26%',
          ],
          usage: [
            'العنب ومكافحة البياض الزغبي: 150 - 200 سم / 100 لتر ماء',
            'البطاطس والطماطم (الندوة المتأخرة والمبكرة): 200 سم / 100 لتر ماء',
            'الخيار والقرعيات: 150 سم / 100 لتر ماء',
          ],
          applicationRate: '200 سم / 100 لتر ماء (1 لتر / 500 لتر ماء)',
          imageHint: 'عبوة 1 لتر بلاستيكية بيضاء مع ملصق أزرق ورمز وقاية فطري',
          imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
          packages: [
            { id: 'PKG-2-1L', displayName: '1 لتر', quantity: 1, unit: 'لتر', price: 580, piecesPerCarton: 12 },
            { id: 'PKG-2-500ML', displayName: '500 مل', quantity: 500, unit: 'مل', price: 320, piecesPerCarton: 20 },
            { id: 'PKG-2-5L', displayName: '5 لتر', quantity: 5, unit: 'لتر', price: 2750, piecesPerCarton: 4 },
          ],
          selectedForImport: true,
        },
        {
          id: `EXT-PRD-${Date.now()}-3`,
          name: 'سبيدرو سوبر 20% ديلتامثرين',
          categoryName: 'مبيدات حشرية وأكاروسية',
          categoryId: catInsecticide,
          shortDescription: 'مبيد حشري بيرثرويدي سريع الفتك (Knock-down) لمكافحة الذبابة البيضاء، الديدان، المن، والتوتا أبسلوتا.',
          description: 'مركب حشري فعال يعمل بالملامسة وعن طريق المعدة، يمتلك كفاءة إبادة سريعة للغاية ضد الأطوار اليرقية والبالغة للحشرات الثاقبة الماصة والقارضة.',
          characteristics: [
            'تأثير صاعق فوري على الجهاز العصبي للحشرات',
            'فترة تحريم قصيرة (PHI) تناسب الزراعات المحمية والتصدير',
            'مقاوم للغسيل بمياه الأمطار والندى',
          ],
          composition: [
            'ديلتامثرين Deltamethrin: 2.5% EC',
            'مذيبات ومواد استحلاب فعالة: 97.5%',
          ],
          usage: [
            'ديدان الثمار والتوتا أبسلوتا: 50 سم / 100 لتر ماء',
            'المن والتربس والذبابة البيضاء: 40 - 50 سم / 100 لتر ماء',
            'ديدان الأوراق في بنجر السكر والقطن: 200 سم / فدان',
          ],
          applicationRate: '50 سم / 100 لتر ماء',
          imageHint: 'زجاجة ألومنيوم معتمة سعة 1 لتر وعبوة 250 سم بغطاء أحمر',
          imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
          packages: [
            { id: 'PKG-3-250ML', displayName: '250 سم', quantity: 250, unit: 'مل', price: 210, piecesPerCarton: 24 },
            { id: 'PKG-3-1L', displayName: '1 لتر', quantity: 1, unit: 'لتر', price: 740, piecesPerCarton: 12 },
          ],
          selectedForImport: true,
        },
        {
          id: `EXT-PRD-${Date.now()}-4`,
          name: 'بيو فيت بلس طحالب بحرية وأمينو',
          categoryName: 'منظمات نمو ومخصبات حيوية',
          categoryId: catGrowth,
          shortDescription: 'مستخلص طحالب أسكوفيلوم نودوزوم مركز مع أحماض أمينية حرة لمقاومة الصقيع والحرارة وتنشيط النمو الجذري والخضري.',
          description: 'منشط حيوي طبيعي غني بالسيتوكينينات والاوكسينات الطبيعية مع 17 نوع من الأحماض الأمينية L-Amino acids، يدعم النبات لتجاوز ظروف الإجهاد المناخي وتثبيت الأزهار.',
          characteristics: [
            'مستخلص طبيعي 100% معتمد للزراعات العضوية',
            'يرفع قدرة النبات على مجابهة الصقيع وموجات الحر الشديد',
            'يزيد التفريع والنمو الخضري ويثبت العقد الزهري',
          ],
          composition: [
            'مستخلص طحالب بحرية طبيعية: 30%',
            'أحماض أمينية حرة حيوية: 15%',
            'نيتروجين عضوي: 4%',
            'بوتاسيوم عضوي: 6%',
          ],
          usage: [
            'أشجار الفاكهة في مرحلة قبل التزهير: 1.5 - 2 سم / لتر ماء',
            'الخضراوات بعد الشتل بـ 15 يوم: 1 لتر / فدان حقناً',
            'عند توقع موجات برد أو صقيع: 250 سم / 100 لتر ماء رشاً',
          ],
          applicationRate: '200 سم / 100 لتر ماء',
          imageHint: 'جركن بلاستيكي أخضر سعة 1 لتر و5 لتر مع ورقة نبات ذهبية',
          imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=600&auto=format&fit=crop&q=80',
          packages: [
            { id: 'PKG-4-1L', displayName: '1 لتر', quantity: 1, unit: 'لتر', price: 360, piecesPerCarton: 12 },
            { id: 'PKG-4-5L', displayName: '5 لتر', quantity: 5, unit: 'لتر', price: 1650, piecesPerCarton: 4 },
          ],
          selectedForImport: true,
        },
      ],
    };
  },
};
