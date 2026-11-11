import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
let cachedWorkingModel: string | null = null;
function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const cleanCustom = (customApiKey || '').trim();
  if (cleanCustom) {
    return new GoogleGenAI({ apiKey: cleanCustom });
  }
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'مفتاح Gemini API غير مُعدّ في السيرفر (GEMINI_API_KEY). يمكنك إضافته في إعدادات البيئة أو إدخاله مباشرة في نافذة الذكاء الاصطناعي.'
      );
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

const isVercelEnv = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

function getStoreFilePath(filename: string): string {
  const baseDir = isVercelEnv ? os.tmpdir() : process.cwd();
  return path.join(baseDir, filename);
}

function readJsonStore<T = any[]>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch (e) {
    console.warn(`[CROPSA Server] Failed reading store ${filePath}:`, e);
  }
  return fallback;
}

function writeJsonStore(filePath: string, value: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`[CROPSA Server] Failed writing store ${filePath}:`, e);
  }
}

export function createApiApp() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
  if (!isVercelEnv) {
    try {
      fs.mkdirSync(path.join(uploadsRoot, 'ai-products'), { recursive: true });
    } catch {
      // Ignore read-only fs errors cleanly
    }
  }

  // Save cropped/uploaded product image (disk locally; compressed fallback on Vercel serverless)
  app.post('/api/uploads/image', (req, res) => {
    try {
      const { dataUrl, fileName } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return res.status(400).json({ success: false, error: 'صورة غير صالحة' });
      }
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
      if (!match) {
        return res.status(400).json({ success: false, error: 'صيغة الصورة غير مدعومة' });
      }

      if (isVercelEnv) {
        return res.json({ success: true, url: dataUrl, storage: 'inline-compressed' });
      }

      try {
        const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
        const baseName =
          (fileName || 'prd')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 24) || 'prd';
        const finalFile = `${baseName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const outDir = path.join(uploadsRoot, 'ai-products');
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, finalFile), Buffer.from(match[2], 'base64'));
        return res.json({ success: true, url: `/uploads/ai-products/${finalFile}` });
      } catch {
        return res.json({ success: true, url: dataUrl, storage: 'inline-fallback' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Handle body-parser size limit error gracefully
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      console.warn('[CROPSA Server] Request entity too large (413):', err.message);
      return res.status(413).json({
        success: false,
        error:
          'حجم الملفات المرفوعة في هذا الطلب كبير جداً. يرجى استخدام نظام التجزئة التلقائي أو استخراج النصوص الرقمية.',
      });
    }
    next(err);
  });

  // Health Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: 'CROPSA Dynamic Agricultural Catalog',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      environment: isVercelEnv ? 'vercel' : 'local',
      timestamp: new Date().toISOString(),
    });
  });

  // AI Catalog Extraction Route
  app.post('/api/gemini/extract-catalog', async (req, res) => {
    const modelErrors: string[] = [];
    try {
      const {
        companyName = 'شركة كروپسا للحلول والمخصبات الزراعية',
        existingCategories = [],
        files = [],
        fileData,
        mimeType,
        pastedText,
        additionalNotes = '',
        customApiKey = '',
      } = req.body;

      const ai = getGeminiClient(customApiKey);
      const parts: any[] = [];

      const allFiles = [...files];
      if (fileData && mimeType) {
        allFiles.push({ data: fileData, mimeType });
      }
      if (allFiles.length === 0 && !String(pastedText || '').trim()) {
        return res.status(400).json({
          success: false,
          error: 'يرجى رفع ملفات الكتالوج أو لصق نصوص المنتجات أولاً.',
        });
      }

      let imgIdx = 0;
      for (const f of allFiles) {
        if (!f.data) continue;
        let cleanBase64 = f.data;
        if (cleanBase64.includes('base64,')) {
          cleanBase64 = cleanBase64.split('base64,')[1];
        }
        cleanBase64 = cleanBase64.trim();
        let mime = f.mimeType || 'application/pdf';
        if (mime === 'image/jpg') mime = 'image/jpeg';

        parts.push({
          text: `[ملف/صفحة رقم ${imgIdx}] (${f.name || 'صفحة كتالوج'})${
            f.pageText ? `\nالنص المستخرج من هذه الصفحة:\n${f.pageText}` : ''
          }`,
        });
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mime,
          },
        });
        imgIdx++;
      }

      const promptLines = [
        `أنت خبير واستشاري زراعي متخصص في تفريغ وفهرسة كتالوجات الأسمدة، المبيدات، والمخصبات الزراعية للشركات في السوق المصري والعربي.`,
        `المطلوب: فحص هذا الكتالوج القديم والملفات المرفقة لشركة "${companyName}" واستخراج جميع المنتجات والمركبات مع أسعارها وعبواتها ومواصفاتها وصور عبواتها بدقة متناهية.`,
        ``,
        `قائمة الأقسام المتاحة حالياً في النظام لتوزيع المنتجات عليها (اختر الأنسب أو اقترح قسماً مطابقاً):`,
        existingCategories.length > 0
          ? existingCategories.join(' ، ')
          : 'أسمدة ورقية ومخصبات، مبيدات فطرية، مبيدات حشرية، عناصر صغرى، منظمات نمو، مبيدات حشائش، معالجات ملوحة وأحماض، مخصبات حيوية، بذور وتقاوي',
        ``,
        `ملاحظات إضافية من المستخدم:`,
        additionalNotes ||
          'استخرج جميع المنتجات بكل تفاصيلها والأسعار بالجنيه المصري لكل عبوة (لتر، كرتونة، كجم).',
        ``,
        pastedText ? `بيانات أو نصوص مرفقة مع الكتالوج:\n${pastedText}\n` : '',
        `قواعد التصنيف الزراعية الصارمة لتحديد نوع المركب والقسم:`,
        `1. الأسمدة (fertilizer): أي منتج بودر / مسحوق / حبيبات / شيكارة (يقاس بالكيلوجرام أو الجرام أو بودرة ذائبة).`,
        `2. المخصبات (stimulant): أي منتج سائل (يقاس باللتر أو السنتيمتر المكعب سم³ أو الملليمتر ml).`,
        `3. المبيدات (pesticide): أي منتج وظيفته الأساسية مكافحة أو علاج آفة محددة (مثل مبيدات الحشائش، المبيدات الفطرية، المبيدات الحشرية، مكافحة النيماتودا والأكاروسات).`,
        ``,
        `تعليمات الاستخراج الدقيق:`,
        `1. اسم المنتج: الاسم التجاري المشهور باللغة العربية، مع الاسم العلمي أو الإنجليزي إن وجد.`,
        `2. نوع المنتج (productType): حدد إما 'fertilizer' (سماد بودر) أو 'stimulant' (مخصب سائل) أو 'pesticide' (مبيد مكافحة).`,
        `3. الوصف: سطر أو سطرين يشرحان وظيفة المركب الرئيسية وفائدته للنبات والتربة.`,
        `4. التركيب الكيميائي: استخرج المواد الفعالة والنسب المئوية بالتفصيل (مثل: N 20% + P2O5 20% + K2O 20% أو نحاس أو ديازينون أو حمض فوسفوريك).`,
        `5. المميزات: قائمة بأهم فوائد ومميزات المركب.`,
        `6. التوصيات ومعدلات الاستخدام: جرعة الرش الورقي أو التسميد الأرضي للمحاصيل (مثل 200 سم / 100 لتر ماء).`,
        `7. العبوات والأسعار: استخرج كل حجم عبوة مع سعرها الرسمي بالجنيه المصري (مثلا عبوة 1 لتر بسعر 350، وعبوة 5 لتر بسعر 1600). إذا كانت أسعار الكراتين مذكورة استخرج عدد العبوات في الكرتونة. إذا لم يذكر عدد العبوات في الكرتونة ضع القيمة الافتراضية المناسبة (اللتر 12 عبوة، الـ 250 سم 24 عبوة، الـ 5 لتر 4 عبوات، الشيكارة 25 كجم 1).`,
        `8. سحب وقص صورة المنتج الفعلية من الكتالوج (هام جداً): لكل منتج توجد له صورة/عبوة/زجاجة/شيكارة في الملف/الصفحة المرفقة، حدد رقم الملف أو الصفحة (sourceImageIndex بدءاً من 0 حسب الترقيم [ملف/صفحة رقم X]) وحدد الإحداثيات الدقيقة لمربع صورة العبوة نفسها فقط (imageBox: ymin, xmin, ymax, xmax بنظام 0 إلى 1000) لكي نقوم بقص الصورة الحقيقية للمنتج من الكتالوج دون ضياعها. إذا كانت الصفحة تحوي عدة منتجات حدد مربع صورة كل منتج على حدة بدقة.`,
      ];

      parts.push({
        text: promptLines.join('\n'),
      });

      const defaultCandidates: Array<{
        model: string;
        thinkingConfig?: { thinkingLevel?: ThinkingLevel; thinkingBudget?: number };
      }> = [
        { model: 'gemini-3.5-flash-lite' },
        { model: 'gemini-2.5-flash', thinkingConfig: { thinkingBudget: 0 } },
        { model: 'gemini-3.8-flash', thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
        { model: 'gemini-flash-latest' },
      ];
      const candidateConfigs = cachedWorkingModel
        ? [
            ...defaultCandidates.filter((c) => c.model === cachedWorkingModel),
            ...(defaultCandidates.some((c) => c.model === cachedWorkingModel)
              ? []
              : [{ model: cachedWorkingModel }]),
            ...defaultCandidates.filter((c) => c.model !== cachedWorkingModel),
          ]
        : defaultCandidates;

      let responseText = '';
      let modelUsed = '';
      let lastError: any = null;
      const startedAt = Date.now();
      const overallBudgetMs = isVercelEnv ? 52_000 : 110_000;
      const perAttemptMs = isVercelEnv ? 28_000 : 50_000;
      const maxAttemptsPerModel = isVercelEnv ? 1 : 2;

      const baseExtractionConfig = {
        systemInstruction:
          'You are an expert agronomist and catalog digitizer with vision localization. Strict rule: powder/granules=fertilizer, liquid/volume=stimulant, pest/weed/fungus targeting=pesticide. Extract agricultural chemical, fertilizer, and pesticide product catalogs with absolute precision into clean JSON. Always capture prices, package sizes, and for every visible product bottle/bag/packaging on any image/page, return sourceImageIndex (0-based) and exact normalized bounding box imageBox { ymin, xmin, ymax, xmax } in 0..1000 coordinates.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            catalogTitle: { type: Type.STRING, description: 'عنوان أو اسم الكتالوج' },
            companyName: { type: Type.STRING, description: 'اسم الشركة المصنعة' },
            catalogYear: { type: Type.STRING, description: 'سنة الكتالوج أو تاريخه' },
            currency: { type: Type.STRING, description: 'العملة' },
            notes: { type: Type.STRING, description: 'أي ملاحظات عامة حول الكتالوج أو الأسعار' },
            products: {
              type: Type.ARRAY,
              description: 'قائمة المنتجات المستخرجة',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'اسم المنتج التجاري باللغة العربية' },
                  productType: {
                    type: Type.STRING,
                    description:
                      'نوع المركب: fertilizer (سماد بودر), stimulant (مخصب سائل), pesticide (مبيد مكافحة)',
                  },
                  categoryName: { type: Type.STRING, description: 'القسم المناسب للمنتج' },
                  shortDescription: { type: Type.STRING, description: 'وصف مختصر للمنتج' },
                  description: { type: Type.STRING, description: 'شرح وتفاصيل المركب ودوره' },
                  characteristics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'مميزات وخصائص المركب',
                  },
                  composition: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'التركيب الكيميائي والنسب المئوية',
                  },
                  usage: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'طريقة ومعدلات الاستخدام والمحاصيل المستهدفة',
                  },
                  applicationRate: {
                    type: Type.STRING,
                    description: 'معدل الاستخدام (مثال: 200 سم / 100 لتر ماء)',
                  },
                  imageHint: { type: Type.STRING, description: 'وصف شكل أو لون عبوة المنتج في الكتالوج' },
                  sourceImageIndex: {
                    type: Type.NUMBER,
                    description:
                      'رقم الصورة أو صفحة الكتالوج المرفوعة التي يظهر فيها المنتج (يبدأ من 0)',
                  },
                  imageBox: {
                    type: Type.OBJECT,
                    description: 'إحداثيات مربع صورة عبوة المنتج فقط داخل الصفحة بنظام 0 إلى 1000',
                    properties: {
                      ymin: { type: Type.NUMBER, description: 'أعلى المربع 0-1000' },
                      xmin: { type: Type.NUMBER, description: 'يسار المربع 0-1000' },
                      ymax: { type: Type.NUMBER, description: 'أسفل المربع 0-1000' },
                      xmax: { type: Type.NUMBER, description: 'يمين المربع 0-1000' },
                    },
                    required: ['ymin', 'xmin', 'ymax', 'xmax'],
                  },
                  packages: {
                    type: Type.ARRAY,
                    description: 'أحجام العبوات والأسعار بالجنيه المصري',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        displayName: {
                          type: Type.STRING,
                          description: 'اسم وحجم العبوة مثل 1 لتر أو 5 لتر أو 1 كجم',
                        },
                        quantity: { type: Type.NUMBER, description: 'الرقم العددي للكمية' },
                        unit: {
                          type: Type.STRING,
                          description: 'الوحدة (لتر، كجم، مل، سم، جرام)',
                        },
                        price: { type: Type.NUMBER, description: 'السعر بالجنيه المصري' },
                        piecesPerCarton: {
                          type: Type.NUMBER,
                          description: 'عدد العبوات في الكرتونة',
                        },
                      },
                      required: ['displayName', 'quantity', 'unit', 'price'],
                    },
                  },
                },
                required: ['name', 'shortDescription', 'packages'],
              },
            },
          },
          required: ['products'],
        },
      };

      const tryInvokeModel = async (
        modelName: string,
        thinkingConfig?: { thinkingLevel?: ThinkingLevel; thinkingBudget?: number }
      ): Promise<boolean> => {
        const remainingMs = overallBudgetMs - (Date.now() - startedAt);
        if (remainingMs < 4000) return false;

        const attemptTimeoutMs = Math.min(perAttemptMs, remainingMs - 1000);
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), attemptTimeoutMs);
        let raceTimer: ReturnType<typeof setTimeout> | undefined;

        try {
          console.log(
            `[CROPSA Catalog AI] Invoking ${modelName} (timeout ${attemptTimeoutMs}ms)...`
          );
          const modelConfig = {
            ...baseExtractionConfig,
            abortSignal: controller.signal,
            ...(thinkingConfig ? { thinkingConfig } : {}),
          };
          const response = await Promise.race([
            ai.models.generateContent({
              model: modelName,
              contents: { parts },
              config: modelConfig,
            }),
            new Promise<never>((_, reject) => {
              raceTimer = setTimeout(
                () => reject(new Error(`Gemini timeout (${modelName}) after ${attemptTimeoutMs}ms`)),
                attemptTimeoutMs + 250
              );
            }),
          ]);

          if (response && response.text) {
            responseText = response.text;
            modelUsed = modelName;
            cachedWorkingModel = modelName;
            console.log(`[CROPSA Catalog AI] Model ${modelName} succeeded in ${Date.now() - startedAt}ms!`);
            return true;
          }
        } catch (err: any) {
          const errStr = err?.message || String(err);
          console.warn(`[CROPSA Catalog AI] Model ${modelName} failed:`, errStr);
          modelErrors.push(`${modelName}: ${errStr}`);
          lastError = err;
        } finally {
          clearTimeout(abortTimer);
          if (raceTimer) clearTimeout(raceTimer);
        }
        return false;
      };

      const triedModels = new Set<string>();
      for (const candidate of candidateConfigs) {
        triedModels.add(candidate.model);
        for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
          if (await tryInvokeModel(candidate.model, candidate.thinkingConfig)) break;
          if (attempt < maxAttemptsPerModel) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
        if (responseText) break;
      }

      // Dynamic discovery fallback: if static aliases failed, query models authorized on the active API key
      if (!responseText && overallBudgetMs - (Date.now() - startedAt) >= 8000) {
        try {
          const pager = await ai.models.list({ config: { pageSize: 50 } });
          const discovered: string[] = [];
          for await (const m of pager) {
            const rawName = (m.name || '').replace(/^models\//, '');
            if (
              rawName &&
              !triedModels.has(rawName) &&
              rawName.includes('gemini') &&
              rawName.includes('flash') &&
              !rawName.includes('tts') &&
              !rawName.includes('image') &&
              !rawName.includes('live') &&
              (!m.supportedActions || m.supportedActions.includes('generateContent'))
            ) {
              discovered.push(rawName);
            }
          }
          for (const fallbackModel of discovered.slice(0, 2)) {
            if (await tryInvokeModel(fallbackModel)) break;
          }
        } catch (listErr: any) {
          modelErrors.push(`models.list: ${listErr?.message || String(listErr)}`);
        }
      }

      if (!responseText) {
        let fallbackMsg =
          (modelErrors.length > 0 ? modelErrors.join(' | ') : lastError?.message) ||
          'تعذر استخراج بيانات الكتالوج بالذكاء الاصطناعي.';
        try {
          const parsed = JSON.parse(fallbackMsg);
          if (parsed?.error?.message) fallbackMsg = parsed.error.message;
        } catch {
          // not json
        }
        throw new Error(fallbackMsg);
      }

      let parsedData: any = {};
      try {
        let cleanJson = responseText.trim();
        cleanJson = cleanJson
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/, '')
          .replace(/```$/g, '')
          .trim();
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
        }
        parsedData = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.error('[CROPSA JSON Parse Error]:', parseErr, responseText);
        throw new Error('فشل تنسيق البيانات المستخرجة من الكتالوج. يرجى إعادة المحاولة.');
      }

      res.json({
        success: true,
        modelUsed,
        data: parsedData,
        extractedProductsCount: parsedData.products?.length || 0,
      });
    } catch (error: any) {
      console.error('[CROPSA Catalog Extraction Error]:', error);
      let errorMsg = error.message || 'فشل استخراج بيانات الكتالوج بالذكاء الاصطناعي';
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed?.error?.message) {
          errorMsg = parsed.error.message;
        }
      } catch {
        // Not JSON
      }

      if (
        errorMsg.includes('503') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('high demand')
      ) {
        errorMsg =
          'خوادم الذكاء الاصطناعي تواجه ضغطاً مؤقتاً في هذه اللحظة. يرجى إعادة المحاولة خلال ثوانٍ معدودة.';
      } else if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429')) {
        errorMsg = 'تم الوصول إلى الحد اللحظي للطلبات. يرجى الانتظار قليلاً ثم إعادة المحاولة.';
      } else if (errorMsg.includes('API_KEY')) {
        errorMsg = 'مفتاح خدمة الذكاء الاصطناعي غير متوفر أو غير صالح. يرجى التحقق من إعدادات المفتاح.';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('abort')) {
        errorMsg = `انتهت مهلة الاتصال بنموذج الذكاء الاصطناعي (${errorMsg}). يرجى تقليل عدد الصفحات أو المحاولة مرة أخرى.`;
      }

      res.status(500).json({
        success: false,
        error: errorMsg,
        details: modelErrors,
      });
    }
  });

  // Orders Persistence & Webhook Dispatch
  const ordersStorePath = getStoreFilePath('orders-store.json');

  app.post('/api/orders', async (req, res) => {
    try {
      const { order, webhookUrl, origin } = req.body;
      if (!order || !order.orderNumber) {
        return res.status(400).json({ success: false, error: 'بيانات الطلبية غير مكتملة' });
      }

      const existing = readJsonStore<any[]>(ordersStorePath, []);
      const updated = [order, ...existing.filter((o: any) => o.orderNumber !== order.orderNumber)];
      writeJsonStore(ordersStorePath, updated);

      const baseUrl = origin || `${req.protocol}://${req.get('host')}`;
      const actionUrl = `${baseUrl}/?order=${encodeURIComponent(order.orderNumber)}`;
      const paymentLabel =
        order.paymentMethod === 'installment'
          ? 'تقسيط (سيتواصل فريق المبيعات)'
          : 'كاش عند الاستلام';

      const itemsLines = (order.items || [])
        .map(
          (item: any, idx: number) =>
            `${idx + 1}. ${item.productName}${item.companyName ? ` (${item.companyName})` : ''} — ${item.quantity} × ${item.packageDisplayName} = ${item.subtotal} ج.م`
        )
        .join('\n');

      const messageBody = [
        `🧾 *فاتورة وطلبية جديدة — كروپسا CROPSA*`,
        `━━━━━━━━━━━━━━━━━`,
        `📄 *رقم الطلبية:* ${order.orderNumber}`,
        `👤 *اسم العميل:* ${order.customerName}`,
        `📞 *رقم العميل:* ${order.phone}`,
        `📍 *العنوان:* ${order.governorate || ''} - ${order.city || ''} ${order.addressDetails ? `(${order.addressDetails})` : ''}`,
        `💳 *نوع الدفع:* ${paymentLabel}`,
        `💰 *قيمة الفاتورة:* ${Number(order.totalAmount || 0).toLocaleString('en-US')} جنيه مصري`,
        `━━━━━━━━━━━━━━━━━`,
        `🛒 *تفاصيل المنتجات:*`,
        itemsLines,
        order.notes ? `📝 *ملاحظات:* ${order.notes}` : '',
        `━━━━━━━━━━━━━━━━━`,
        `🔗 *عرض الطلبية والمنتجات بالكامل في الموقع (زر الإجراء للموظف):*`,
        actionUrl,
      ]
        .filter(Boolean)
        .join('\n');

      const targetWebhook = webhookUrl || process.env.ORDER_WEBHOOK_URL;
      let webhookDispatched = false;
      let webhookError: string | null = null;

      if (targetWebhook && /^https?:\/\//i.test(targetWebhook)) {
        try {
          const webhookRes = await fetch(targetWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'new_order',
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              customerPhone: order.phone,
              governorate: order.governorate,
              city: order.city,
              addressDetails: order.addressDetails,
              paymentMethod: order.paymentMethod,
              paymentMethodLabel: paymentLabel,
              totalAmount: order.totalAmount,
              currency: 'جنيه مصري',
              items: order.items,
              notes: order.notes || '',
              actionUrl,
              actionButtonText: 'عرض الطلبية والمنتجات في الموقع',
              messageBody,
              createdAt: order.createdAt,
            }),
          });
          webhookDispatched = webhookRes.ok;
          if (!webhookRes.ok) {
            webhookError = `Webhook returned status ${webhookRes.status}`;
          }
        } catch (err: any) {
          webhookError = err.message || 'Webhook dispatch error';
          console.warn('[CROPSA Server] Webhook dispatch failed:', webhookError);
        }
      }

      res.json({
        success: true,
        order,
        actionUrl,
        messageBody,
        webhookDispatched,
        webhookError,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/orders/:orderNumber', (req, res) => {
    const { orderNumber } = req.params;
    const list = readJsonStore<any[]>(ordersStorePath, []);
    const found = list.find((o: any) => o.orderNumber === orderNumber || o.id === orderNumber);
    if (!found) {
      return res.status(404).json({ success: false, error: 'الطلبية غير موجودة' });
    }
    res.json({ success: true, order: found });
  });

  app.patch('/api/orders/:orderNumber/status', (req, res) => {
    const { orderNumber } = req.params;
    const { status } = req.body;
    const list = readJsonStore<any[]>(ordersStorePath, []);
    const idx = list.findIndex((o: any) => o.orderNumber === orderNumber || o.id === orderNumber);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'الطلبية غير موجودة' });
    }
    list[idx] = { ...list[idx], status, updatedAt: new Date().toISOString() };
    writeJsonStore(ordersStorePath, list);
    res.json({ success: true, order: list[idx] });
  });

  // Shareable Custom Client Catalogs Persistence
  const customCatalogsStorePath = getStoreFilePath('custom-catalogs-store.json');

  app.post('/api/custom-catalogs', (req, res) => {
    try {
      const { catalog, origin } = req.body || {};
      if (!catalog || !catalog.id) {
        return res.status(400).json({ success: false, error: 'بيانات الكتالوج المخصص غير مكتملة' });
      }
      const existing = readJsonStore<any[]>(customCatalogsStorePath, []).filter(
        (c: any) => c.id !== catalog.id
      );
      const updated = [catalog, ...existing].slice(0, 250);
      writeJsonStore(customCatalogsStorePath, updated);

      const baseUrl = origin || `${req.protocol}://${req.get('host')}`;
      const shareUrl = `${baseUrl}/?catalog=${encodeURIComponent(catalog.id)}`;
      res.json({ success: true, catalog, shareUrl });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/custom-catalogs/:catalogId', (req, res) => {
    const { catalogId } = req.params;
    const found = readJsonStore<any[]>(customCatalogsStorePath, []).find(
      (c: any) => c.id === catalogId
    );
    if (!found) {
      return res
        .status(404)
        .json({ success: false, error: 'رابط الكتالوج غير موجود أو انتهت صلاحيته' });
    }
    res.json({ success: true, catalog: found });
  });

  app.get('/api/catalog/status', (_req, res) => {
    res.json({ status: 'active', version: '2.0.0', organization: 'CROPSA' });
  });

  return app;
}
