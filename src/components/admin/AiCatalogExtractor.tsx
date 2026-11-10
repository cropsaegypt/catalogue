import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  Layers,
  Save,
  RefreshCw,
  Eye,
  Sliders,
  X,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Copy,
  ChevronDown,
  ChevronUp,
  KeyRound,
} from 'lucide-react';
import {
  Company,
  Category,
  Product,
  Package,
  PriceHistory,
  CompanyImage,
  ExtractedProductItem,
  ExtractedPackage,
} from '../../types';
import { aiCatalogService, CatalogExtractionResult } from '../../services/aiCatalogService';
import { pdfHelper } from '../../utils/pdfHelper';
import { ImageFileInput } from '../common/ImageFileInput';
import { AGRICULTURAL_PRESET_IMAGES, getAgriculturalProductImage } from '../../utils/agriculturalImages';

export interface UploadedCatalogFile {
  file: File;
  base64: string;
  preview: string;
  isPdf: boolean;
  pdfText?: string;
  pdfPageTexts?: Record<number, string>;
  hasEmbeddedText?: boolean;
  pageCount?: number;
  compressedSizeKb?: number;
}

interface AiCatalogExtractorProps {
  companies: Company[];
  categories: Category[];
  existingProducts: Product[];
  existingPackages: Package[];
  companyImages: CompanyImage[];
  defaultCompanyId?: string;
  onSaveProducts: (products: Product[]) => void;
  onSavePackages: (packages: Package[]) => void;
  onSaveImages?: (images: CompanyImage[]) => void;
  onSaveCategories?: (categories: Category[]) => void;
  onAddPriceHistory?: (entry: Omit<PriceHistory, 'id' | 'createdAt'>) => void;
  onAddImportLog?: (log: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  onClose?: () => void;
}

export const AiCatalogExtractor: React.FC<AiCatalogExtractorProps> = ({
  companies,
  categories,
  existingProducts,
  existingPackages,
  companyImages,
  defaultCompanyId,
  onSaveProducts,
  onSavePackages,
  onSaveImages,
  onSaveCategories,
  onAddPriceHistory,
  onAddImportLog,
  onShowToast,
  onClose,
}) => {
  // Selected Company
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    defaultCompanyId || (companies[0]?.id || '')
  );

  // API Key availability check
  const [serverHasKey, setServerHasKey] = useState<boolean>(true);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('cropsa_custom_gemini_key') || '';
  });

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((res) => {
        if (typeof res?.hasGeminiKey === 'boolean') {
          setServerHasKey(res.hasGeminiKey);
        }
      })
      .catch(() => {});
  }, []);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedCatalogFile[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [extractionResult, setExtractionResult] = useState<CatalogExtractionResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);


  // Filter and bulk controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  // Bulk Price Adjuster Modal
  const [isPriceAdjustModalOpen, setIsPriceAdjustModalOpen] = useState(false);
  const [priceAdjustPercent, setPriceAdjustPercent] = useState<number>(10);
  const [priceAdjustMode, setPriceAdjustMode] = useState<'increase' | 'decrease'>('increase');

  // Image Picker Modal for a specific product
  const [activeImagePickerProductId, setActiveImagePickerProductId] = useState<string | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const relevantCompanyImages = companyImages.filter((img) => img.companyId === selectedCompanyId);

  // Handle files selection with client-side PDF extraction and aggressive image optimization
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingStep('جاري قراءة وفحص ملفات الكتالوج...');

    const newFilesList: UploadedCatalogFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImg = file.type.startsWith('image/');

      if (isPdf) {
        setProcessingStep(`جاري فحص محتوى كتالوج PDF: ${file.name}...`);
        try {
          // Extract text directly in client browser using pdfjs
          const pdfResult = await pdfHelper.extractText(file, 40);

          let preview = '';
          try {
            const pageImgs = await pdfHelper.renderPagesToImages(file, 1, 1, 300, 0.6);
            if (pageImgs.length > 0) preview = pageImgs[0].dataUrl;
          } catch (thumbErr) {
            console.log('Thumbnail preview fallback:', thumbErr);
          }

          newFilesList.push({
            file,
            base64: '',
            preview,
            isPdf: true,
            pdfText: pdfResult.text,
            pdfPageTexts: pdfResult.pageTexts,
            hasEmbeddedText: pdfResult.hasText,
            pageCount: pdfResult.pageCount,
          });

          if (pdfResult.hasText) {
            onShowToast(
              `تم استخراج نصوص ${file.name} (${pdfResult.pageCount} صفحة) لتسريع المعالجة وتجاوز أي قيود في الحجم!`,
              'success'
            );
          }
        } catch (pdfErr) {
          console.error('PDF text extraction error:', pdfErr);
          if (file.size < 12 * 1024 * 1024) {
            const base64 = await aiCatalogService.fileToBase64(file);
            newFilesList.push({
              file,
              base64,
              preview: '',
              isPdf: true,
              hasEmbeddedText: false,
            });
          } else {
            onShowToast(
              `ملف PDF (${(file.size / 1024 / 1024).toFixed(1)} MB) كبير. سيتم تفعيل نظام التجزئة التلقائي.`,
              'warning'
            );
          }
        }
      } else if (isImg) {
        setProcessingStep(`جاري ضغط وتحسين صورة الكتالوج: ${file.name}...`);
        try {
          const compressed = await aiCatalogService.compressImage(file, 1300, 0.75);
          const compressedSizeKb = Math.round((compressed.length * 3) / 4 / 1024);
          newFilesList.push({
            file,
            base64: compressed,
            preview: compressed,
            isPdf: false,
            compressedSizeKb,
          });
        } catch (imgErr) {
          console.error('Image compression error', imgErr);
        }
      } else {
        const base64 = await aiCatalogService.fileToBase64(file);
        newFilesList.push({
          file,
          base64,
          preview: '',
          isPdf: false,
        });
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFilesList]);
    setIsProcessing(false);
    setProcessingStep('');
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Run AI Extraction
  const handleRunAiExtraction = async () => {
    if (!selectedCompany) {
      onShowToast('يرجى اختيار الشركة المصنعة أولاً', 'error');
      return;
    }

    if (uploadedFiles.length === 0 && !pastedText.trim()) {
      onShowToast('يرجى رفع ملف الكتالوج (PDF أو صور) أو لصق بيانات الكتالوج', 'error');
      return;
    }

    setIsProcessing(true);
    setExtractError(null);
    setProcessingStep('جاري تفريغ محتويات الكتالوج وإعداد الدفعات الذكية...');

    try {
      const combinedPastedText = pastedText.trim();
      const filesPayload: Array<{ data: string; mimeType: string; name?: string; pageText?: string }> = [];

      // Process uploaded files: render PDF pages as images AND attach per-page text so AI extracts both prices & real product photos!
      for (const item of uploadedFiles) {
        if (item.isPdf) {
          const pagesToRender = Math.min(item.pageCount || 12, 24);
          setProcessingStep(
            `جاري تحويل صفحات كتالوج ${item.file.name} (${pagesToRender} صفحة) لصور عالية الدقة لسحب صور المنتجات...`
          );
          const pageImages = await pdfHelper.renderPagesToImages(
            item.file,
            1,
            pagesToRender,
            1400,
            0.8
          );
          if (pageImages.length > 0) {
            for (const pImg of pageImages) {
              filesPayload.push({
                data: pImg.dataUrl,
                mimeType: 'image/jpeg',
                name: `${item.file.name} - صفحة ${pImg.pageNum}`,
                pageText: item.pdfPageTexts?.[pImg.pageNum],
              });
            }
          } else if (item.base64) {
            filesPayload.push({
              data: item.base64,
              mimeType: 'application/pdf',
              name: item.file.name,
            });
          }
        } else if (item.base64) {
          filesPayload.push({
            data: item.base64,
            mimeType: item.file.type || 'image/jpeg',
            name: item.file.name,
          });
        }
      }

      setProcessingStep('جاري استخراج المنتجات والأسعار وقص صور العبوات الحقيقية...');

      const result = await aiCatalogService.extractCatalog(
        {
          companyName: selectedCompany.name,
          existingCategories: categories.map((c) => c.name),
          files: filesPayload,
          pastedText: combinedPastedText.trim() || undefined,
          additionalNotes: additionalNotes.trim() || undefined,
          customApiKey: customApiKey.trim() || undefined,
          onProgress: (stepMsg) => setProcessingStep(stepMsg),
        },
        categories
      );

      setExtractionResult(result);
      setExtractError(null);
      // Auto-expand all product cards initially
      const expandMap: Record<string, boolean> = {};
      result.products.forEach((p) => {
        expandMap[p.id] = true;
      });
      setExpandedProductIds(expandMap);

      onShowToast(
        `تم استخراج ${result.products.length} منتج وعبوة لشركة ${selectedCompany.name} بنجاح!`,
        'success'
      );
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'حدث خطأ أثناء استخراج بيانات الكتالوج بالذكاء الاصطناعي';
      setExtractError(msg);
      onShowToast(msg, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Load sample demo data for 1-click test
  const handleLoadSampleCatalog = () => {
    if (!selectedCompany) return;
    setExtractError(null);
    const sample = aiCatalogService.getSampleCatalogData(selectedCompany.name, categories);
    setExtractionResult(sample);
    const expandMap: Record<string, boolean> = {};
    sample.products.forEach((p) => {

      expandMap[p.id] = true;
    });
    setExpandedProductIds(expandMap);
    onShowToast(`تم تحميل نموذج استخراج كتالوج تجريبي لشركة ${selectedCompany.name}`, 'success');
  };

  // Toggle card expansion
  const toggleExpand = (productId: string) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Update extracted product field
  const handleUpdateProduct = (productId: string, updates: Partial<ExtractedProductItem>) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.map((p) => (p.id === productId ? { ...p, ...updates } : p)),
    });
  };

  // Selection toggles
  const handleToggleSelectAll = (select: boolean) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.map((p) => ({ ...p, selectedForImport: select })),
    });
  };

  const handleToggleSelectProduct = (productId: string) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.map((p) =>
        p.id === productId ? { ...p, selectedForImport: !p.selectedForImport } : p
      ),
    });
  };

  // Add new package to a product
  const handleAddPackage = (productId: string) => {
    if (!extractionResult) return;
    const newPkg: ExtractedPackage = {
      id: `PKG-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      displayName: '1 لتر',
      quantity: 1,
      unit: 'لتر',
      price: 150,
      piecesPerCarton: 12,
    };

    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.map((p) =>
        p.id === productId ? { ...p, packages: [...p.packages, newPkg] } : p
      ),
    });
  };

  // Update package
  const handleUpdatePackage = (productId: string, pkgIdx: number, updates: Partial<ExtractedPackage>) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.map((p) => {
        if (p.id !== productId) return p;
        const newPkgs = [...p.packages];
        newPkgs[pkgIdx] = { ...newPkgs[pkgIdx], ...updates };
        return { ...p, packages: newPkgs };
      }),
    });
  };

  // Remove package
  const handleRemovePackage = (productId: string, pkgIdx: number) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.map((p) => {
        if (p.id !== productId) return p;
        return { ...p, packages: p.packages.filter((_, idx) => idx !== pkgIdx) };
      }),
    });
  };

  // Add new manual product to table
  const handleAddNewProductRow = () => {
    if (!extractionResult) return;
    const newProd: ExtractedProductItem = {
      id: `EXT-MANUAL-${Date.now()}`,
      name: 'مركب زراعي جديد',
      categoryName: categories[0]?.name || 'أسمدة ورقية ومخصبات',
      categoryId: categories[0]?.id || '',
      shortDescription: 'وصف واستخدام المركب الزراعي',
      description: '',
      characteristics: ['سريع المفعول والتأثير'],
      composition: ['مادة فعالة 20%'],
      usage: ['رش ورقي 200 سم / 100 لتر ماء'],
      applicationRate: '200 سم / 100 لتر ماء',
      packages: [
        { id: `PKG-${Date.now()}-1`, displayName: '1 لتر', quantity: 1, unit: 'لتر', price: 200, piecesPerCarton: 12 },
      ],
      selectedForImport: true,
    };

    setExtractionResult({
      ...extractionResult,
      products: [newProd, ...extractionResult.products],
    });
    setExpandedProductIds((prev) => ({ ...prev, [newProd.id]: true }));
  };

  // Delete product from extracted table
  const handleDeleteProduct = (productId: string) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.filter((p) => p.id !== productId),
    });
  };

  // Duplicate product
  const handleDuplicateProduct = (prod: ExtractedProductItem) => {
    if (!extractionResult) return;
    const duplicated: ExtractedProductItem = {
      ...prod,
      id: `EXT-DUP-${Date.now()}`,
      name: `${prod.name} (نسخة)`,
      packages: prod.packages.map((pkg, i) => ({
        ...pkg,
        id: `PKG-${Date.now()}-${i}`,
      })),
      selectedForImport: true,
    };
    setExtractionResult({
      ...extractionResult,
      products: [duplicated, ...extractionResult.products],
    });
  };

  // Bulk price adjust
  const handleApplyBulkPriceAdjustment = () => {
    if (!extractionResult) return;
    const factor = priceAdjustMode === 'increase' ? 1 + priceAdjustPercent / 100 : 1 - priceAdjustPercent / 100;

    setExtractionResult({
      ...extractionResult,
      products: extractionResult.products.map((p) => {
        if (!p.selectedForImport) return p;
        return {
          ...p,
          packages: p.packages.map((pkg) => ({
            ...pkg,
            price: Math.round(pkg.price * factor),
          })),
        };
      }),
    });

    setIsPriceAdjustModalOpen(false);
    onShowToast(
      `تم ${priceAdjustMode === 'increase' ? 'زيادة' : 'خصم'} الأسعار بنسبة ${priceAdjustPercent}% للمنتجات المحددة`,
      'success'
    );
  };

  // Confirm and Save into App State & Persistence
  const handleConfirmAndSave = () => {
    if (!extractionResult || !selectedCompany) return;

    const selectedProducts = extractionResult.products.filter((p) => p.selectedForImport);
    if (selectedProducts.length === 0) {
      onShowToast('يرجى تحديد منتج واحد على الأقل للاعتماد والحفظ', 'error');
      return;
    }

    const newProductsToAdd: Product[] = [];
    const newPackagesToAdd: Package[] = [];
    const newImagesToAdd: CompanyImage[] = [];
    const updatedCategoriesList = [...categories];
    let createdNewCategory = false;

    selectedProducts.forEach((extProd, index) => {
      const prodId = `PRD-${selectedCompany.name.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}-${index + 1}`;

      let matchedCategory = updatedCategoriesList.find(
        (c) =>
          c.id === extProd.categoryId ||
          c.name.toLowerCase() === extProd.categoryName?.toLowerCase() ||
          (extProd.categoryName &&
            (c.name.toLowerCase().includes(extProd.categoryName.toLowerCase()) ||
              extProd.categoryName.toLowerCase().includes(c.name.toLowerCase())))
      );

      // Auto-create category if AI extracted a brand-new category name
      if (!matchedCategory && extProd.categoryName?.trim()) {
        const newCatId = `CAT-AI-${Date.now()}-${index}`;
        const newCat: Category = {
          id: newCatId,
          name: extProd.categoryName.trim(),
          slug: `cat-${Date.now()}-${index}`,
          description: `تم إنشاء القسم تلقائياً أثناء استخراج كتالوج ${selectedCompany.name}`,
          displayOrder: updatedCategoriesList.length + 1,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedCategoriesList.push(newCat);
        matchedCategory = newCat;
        createdNewCategory = true;
      }

      const finalMainImageUrl =
        extProd.imageUrl ||
        getAgriculturalProductImage(extProd.name, extProd.categoryName, selectedCompany.logoUrl);

      if (finalMainImageUrl && (extProd.extractedFromCatalogImage || finalMainImageUrl.startsWith('/uploads/'))) {
        newImagesToAdd.push({
          id: `IMG-AI-${Date.now()}-${index}`,
          companyId: selectedCompany.id,
          fileName: `${extProd.name}.jpg`,
          url: finalMainImageUrl,
          altText: extProd.name,
          createdAt: new Date().toISOString(),
        });
      }

      const firstPiecesPerCarton = extProd.packages[0]?.piecesPerCarton || 12;

      // Build product (with productType properly preserved!)
      const productObj: Product = {
        id: prodId,
        companyId: selectedCompany.id,
        categoryId: matchedCategory ? matchedCategory.id : (updatedCategoriesList[0]?.id || 'CAT-01'),
        productType: extProd.productType || 'fertilizer',
        name: extProd.name,
        shortDescription: extProd.shortDescription || extProd.name,
        description: extProd.description || extProd.shortDescription,
        characteristics: extProd.characteristics || [],
        composition: extProd.composition || [],
        usage: extProd.usage || [],
        applicationRate: extProd.applicationRate || '200 سم / 100 لتر ماء',
        mainImageUrl: finalMainImageUrl,
        displayOrder: existingProducts.length + index + 1,
        active: true,
        allowPieceOrder: true,
        allowCartonOrder: firstPiecesPerCarton > 1,
        piecesPerCarton: firstPiecesPerCarton,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      newProductsToAdd.push(productObj);

      // Build packages
      extProd.packages.forEach((pkg, pIdx) => {
        const pkgId = `PKG-${prodId}-${pIdx + 1}`;
        const pCarton = pkg.piecesPerCarton || 12;
        const packageObj: Package = {
          id: pkgId,
          productId: prodId,
          quantity: pkg.quantity || 1,
          unit: pkg.unit || 'لتر',
          displayName: pkg.displayName || `${pkg.quantity || 1} ${pkg.unit || 'لتر'}`,
          price: pkg.price || 0,
          costPrice: Math.round((pkg.price || 0) * 0.75),
          stockQuantity: 30,
          minStockAlert: 10,
          currency: 'ج.م',
          allowPieceOrder: true,
          allowCartonOrder: pCarton > 1,
          piecesPerCarton: pCarton,
          active: true,
          displayOrder: pIdx + 1,
        };

        newPackagesToAdd.push(packageObj);

        // Record in price history
        if (onAddPriceHistory && packageObj.price > 0) {
          onAddPriceHistory({
            productId: prodId,
            productName: productObj.name,
            packageId: pkgId,
            packageDisplayName: packageObj.displayName,
            oldPrice: 0,
            newPrice: packageObj.price,
            currency: 'ج.م',
            source: 'manual',
            updatedBy: 'الذكاء الاصطناعي (استخراج كتالوج)',
          });
        }
      });
    });

    // Save into existing collections
    if (createdNewCategory && onSaveCategories) {
      onSaveCategories(updatedCategoriesList);
    }
    if (newImagesToAdd.length > 0 && onSaveImages) {
      onSaveImages([...newImagesToAdd, ...companyImages]);
    }

    const combinedProducts = [...existingProducts, ...newProductsToAdd];
    const combinedPackages = [...existingPackages, ...newPackagesToAdd];

    onSaveProducts(combinedProducts);
    onSavePackages(combinedPackages);

    if (onAddImportLog) {
      onAddImportLog({
        fileName: extractionResult.catalogTitle || `كتالوج_${selectedCompany.name}.pdf`,
        companyId: selectedCompany.id,
        totalRows: selectedProducts.length,
        successfulRows: selectedProducts.length,
        updatedRows: 0,
        newRows: selectedProducts.length,
        errorRows: 0,
        errors: [],
        uploadedBy: 'الذكاء الاصطناعي Gemini',
      });
    }

    onShowToast(
      `تم اعتماد وحفظ ${newProductsToAdd.length} منتج و ${newPackagesToAdd.length} عبوة وسعر لصالح ${selectedCompany.name} بنجاح!`,
      'success'
    );

    setExtractionResult(null);
    setUploadedFiles([]);
    setPastedText('');

    // Reset or close
    if (onClose) {
      onClose();
    }
  };

  // Filtered extracted products list
  const filteredProducts = (extractionResult?.products || []).filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === 'all' ||
      p.categoryId === filterCategory ||
      p.categoryName.toLowerCase().includes(filterCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const selectedCount = (extractionResult?.products || []).filter((p) => p.selectedForImport).length;
  const totalPackagesCount = (extractionResult?.products || []).reduce(
    (acc, p) => acc + (p.selectedForImport ? p.packages.length : 0),
    0
  );

  return (
    <div className="space-y-6 dir-rtl animate-in fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#046A47] via-[#035136] to-[#046A47] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-emerald-400/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black text-emerald-200 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>مدعوم بمحرك الذكاء الاصطناعي Gemini 3.8</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            استخراج وتفريغ الكتالوج القديم بالذكاء الاصطناعي
          </h2>
          <p className="text-sm text-emerald-100 font-medium leading-relaxed">
            ارفع ملف الكتالوج القديم للشركة (ملف PDF، صور صفحات الكتالوج، أو جداول الأسعار) وسيقوم الذكاء الاصطناعي
            باستخراج المركبات، التركيبات، أحجام العبوات، والأسعار تلقائياً في جدول متكامل يمكنك تعديل كل حقل فيه قبل الحفظ!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>إلغاء والعودة</span>
            </button>
          )}

          <button
            onClick={handleLoadSampleCatalog}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>تجربة نموذج كتالوج زراعي حقيقي</span>
          </button>
        </div>
      </div>

      {/* Upload and Control Card */}
      <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-6">
        {/* Local API Key helper if server environment doesn't have GEMINI_API_KEY configured */}
        {!serverHasKey && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-950">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>مفتاح Gemini AI (مطلوب للتشغيل المحلي عند عدم ضبط ملف .env)</span>
            </div>
            <input
              type="password"
              value={customApiKey}
              onChange={(e) => {
                setCustomApiKey(e.target.value);
                localStorage.setItem('cropsa_custom_gemini_key', e.target.value);
              }}
              placeholder="ألصق مفتاح Google Gemini API هنا (AIza...) لتشغيل السحب واستخراج الصور"
              className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        {/* Company Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-[#E5E2D9]">
          <div>
            <label className="text-xs font-black text-[#2D2D24] block mb-1.5 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#046A47]" />
              <span>الشركة المصنعة صاحبة الكتالوج *</span>
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-white border border-[#D4D1C5] rounded-xl px-3 py-2.5 text-sm font-bold text-[#2D2D24] focus:ring-2 focus:ring-[#046A47] focus:outline-none"
            >
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} ({existingProducts.filter((p) => p.companyId === comp.id).length} منتجات حالياً)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#5A5A40] mt-1 font-medium">
              سيتم حفظ جميع المنتجات والأسعار المستخرجة تحت اسم هذه الشركة في الكتالوج.
            </p>
          </div>

          <div>
            <label className="text-xs font-black text-[#2D2D24] block mb-1.5 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#046A47]" />
              <span>تعليمات أو شروط إضافية للذكاء الاصطناعي (اختياري)</span>
            </label>
            <input
              type="text"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="مثال: الأسعار بالجنيه المصري، العبوات كجم ولتر، احرص على استخراج المادة الفعالة"
              className="w-full bg-white border border-[#D4D1C5] rounded-xl px-3 py-2.5 text-xs text-[#2D2D24] focus:ring-2 focus:ring-[#046A47] focus:outline-none"
            />
          </div>
        </div>

        {/* Upload Zone */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#2D2D24] flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#046A47]" />
              <span>ملفات الكتالوج (PDF أو صور صفحات الكتالوج)</span>
            </h3>
            <span className="text-xs text-[#5A5A40] font-medium">
              يدعم ملفات PDF، صور JPG / PNG / WEBP، أو لصق نصوص
            </span>
          </div>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#D4D1C5] hover:border-[#046A47] bg-white hover:bg-emerald-50/20 p-8 rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFilesSelected}
              className="hidden"
            />

            <div className="w-14 h-14 bg-emerald-100/60 group-hover:bg-[#046A47] text-[#046A47] group-hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-xs">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-black text-[#2D2D24] group-hover:text-[#046A47] transition-colors">
                اضغط هنا لاختيار ملف الكتالوج أو اسحب الملفات وأفلتها
              </p>
              <p className="text-xs text-[#5A5A40]">
                يمكنك رفع كتالوج PDF كامل أو صفحات متعددة كصور مصورة بالموبايل أو الماسح الضوئي
              </p>
            </div>
          </div>

          {/* Uploaded Files Pills */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#D4D1C5] rounded-xl px-3 py-2 flex items-center gap-2.5 text-xs font-bold text-[#2D2D24] shadow-xs"
                  >
                    {item.preview ? (
                      <img src={item.preview} alt="preview" className="w-7 h-7 object-cover rounded-md border border-[#E5E2D9]" />
                    ) : (
                      <FileText className="w-5 h-5 text-[#046A47]" />
                    )}
                    <div className="flex flex-col">
                      <span className="max-w-[170px] truncate">{item.file.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-[#5A5A40]">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        {item.isPdf && item.hasEmbeddedText && (
                          <span className="bg-emerald-100 text-[#046A47] text-[9px] font-black px-1.5 py-0.5 rounded">
                            نصوص رقمية جاهزة ({item.pageCount || 1} صفحة)
                          </span>
                        )}
                        {item.compressedSizeKb && (
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                            مضغوطة تلقائياً ({item.compressedSizeKb} KB)
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      className="p-1 hover:bg-red-50 text-red-600 rounded-md cursor-pointer transition-colors mr-1"
                      title="إزالة هذا الملف"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/70 rounded-xl p-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#046A47] shrink-0" />
                <span>
                  نظام التجزئة الذكية والضغط المحلي مفعل: يتم معالجة الملفات الكبيرة لتفادي تجاوز حد الخادم المسموح به.
                </span>
              </div>
            </div>
          )}

          {/* Alternative: Pasted text */}
          <div>
            <details className="text-xs text-[#5A5A40] cursor-pointer">
              <summary className="font-bold text-[#046A47] hover:underline mb-2">
                + أو الصق نصوص أو جداول أسعار منسوخة من ملف Word أو شيت إلكتروني
              </summary>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="الصق نصوص الكتالوج، أسماء المركبات، والأسعار هنا..."
                rows={4}
                className="w-full mt-2 bg-white border border-[#D4D1C5] rounded-xl p-3 text-xs text-[#2D2D24] focus:ring-2 focus:ring-[#046A47] focus:outline-none"
              />
            </details>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleRunAiExtraction}
              disabled={isProcessing || (uploadedFiles.length === 0 && !pastedText.trim())}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md ${
                isProcessing || (uploadedFiles.length === 0 && !pastedText.trim())
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#046A47] hover:bg-[#035136] text-white shadow-emerald-900/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                  <span>{processingStep || 'جاري المعالجة بالذكاء الاصطناعي...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>بدء الاستخراج الذكي بالذكاء الاصطناعي الآن</span>
                </>
              )}
            </button>

            {/* Error Banner with Retry & Demo Fallback */}
            {extractError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-red-900">تعذر استخراج بيانات الكتالوج</h4>
                    <p className="text-xs text-red-700 mt-0.5 font-medium leading-relaxed">{extractError}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={handleRunAiExtraction}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة المحاولة</span>
                  </button>
                  <button
                    onClick={handleLoadSampleCatalog}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تجربة نموذج جاهز</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Interactive Review and Edit Table */}
      {extractionResult && (
        <div className="bg-[#FAF8F5] p-6 rounded-3xl border-2 border-emerald-600/40 shadow-sm space-y-6 animate-in fade-in">
          {/* Section Title & Summary Metrics */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E2D9]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-[#046A47] text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>جدول المراجعة والتعديل الفوري</span>
                </span>
                <span className="text-xs font-bold text-[#5A5A40]">
                  {extractionResult.catalogTitle || 'بيانات الكتالوج'}
                </span>
              </div>
              <h3 className="text-xl font-black text-[#2D2D24]">
                المنتجات المستخرجة لشركة {selectedCompany?.name} ({extractionResult.products.length} منتج)
              </h3>
              <p className="text-xs text-[#5A5A40]">
                راجع وعدّل أي حقل تم استخراجه (الاسم، الوصف، المكونات، العبوات، والأسعار)، ثم اضغط اعتماد وحفظ لإدراجها في الكتالوج.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPriceAdjustModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-100/70 hover:bg-emerald-200/80 text-[#046A47] border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="تعديل جماعي للأسعار بنسبة مئوية"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>تعديل جماعي للأسعار (%)</span>
              </button>

              <button
                type="button"
                onClick={handleAddNewProductRow}
                className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-[#046A47] border border-[#D4D1C5] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة منتج يدوي للجدول</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 bg-[#046A47] hover:bg-[#035136] text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>اعتماد وحفظ ({selectedCount}) منتجات في الكتالوج</span>
              </button>
            </div>
          </div>

          {/* Search, Category Filter, and Select All Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E2D9] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleSelectAll(selectedCount < extractionResult.products.length)}
                className="flex items-center gap-2 text-xs font-black text-[#2D2D24] hover:text-[#046A47] cursor-pointer"
              >
                {selectedCount === extractionResult.products.length ? (
                  <CheckSquare className="w-4 h-4 text-[#046A47]" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span>
                  تحديد الكل ({selectedCount} من {extractionResult.products.length} محددة)
                </span>
              </button>

              <span className="text-[#D4D1C5]">|</span>

              <span className="text-xs font-bold text-[#5A5A40]">
                إجمالي الأسعار والعبوات: <strong className="text-[#046A47]">{totalPackagesCount}</strong> عبوة
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المنتجات المستخرجة..."
                className="bg-[#FAF8F5] border border-[#D4D1C5] rounded-xl px-3 py-1.5 text-xs text-[#2D2D24] focus:ring-2 focus:ring-[#046A47] focus:outline-none w-48"
              />

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-[#FAF8F5] border border-[#D4D1C5] rounded-xl px-3 py-1.5 text-xs font-bold text-[#2D2D24] focus:ring-2 focus:ring-[#046A47] focus:outline-none"
              >
                <option value="all">جميع الأقسام</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products List / Cards with Editable Fields */}
          <div className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-[#D4D1C5] space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-[#2D2D24]">لا توجد منتجات مطابقة لفلتر البحث</p>
              </div>
            ) : (
              filteredProducts.map((prod, pIdx) => {
                const isExpanded = !!expandedProductIds[prod.id];

                return (
                  <div
                    key={prod.id}
                    className={`bg-white rounded-2xl border transition-all shadow-xs ${
                      prod.selectedForImport ? 'border-[#046A47]/40 ring-1 ring-[#046A47]/20' : 'border-[#E5E2D9] opacity-75'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E5E2D9]">
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelectProduct(prod.id)}
                          className="cursor-pointer text-[#046A47] hover:scale-110 transition-transform"
                        >
                          {prod.selectedForImport ? (
                            <CheckSquare className="w-5 h-5 text-[#046A47]" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {/* Product Thumbnail & Picker */}
                        <div className="relative group/img shrink-0">
                          <div className="w-16 h-16 rounded-xl border border-[#D4D1C5] bg-white overflow-hidden flex items-center justify-center shadow-2xs">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-[#8A8A6D]" />
                            )}
                          </div>
                          {prod.extractedFromCatalogImage && (
                            <span
                              className="absolute -bottom-1.5 inset-x-0.5 text-center bg-emerald-700 text-white text-[8px] font-black px-1 py-0.2 rounded shadow-xs pointer-events-none"
                              title="تم قص وسحب الصورة الحقيقية من الكتالوج المرفوع"
                            >
                              من الكتالوج
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveImagePickerProductId(prod.id)}
                            className="absolute inset-0 bg-black/50 text-white text-[10px] font-bold rounded-xl flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                            title="اختيار أو تغيير صورة المنتج"
                          >
                            تغيير
                          </button>
                        </div>

                        {/* Name and Category Inputs */}
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <input
                              type="text"
                              value={prod.name}
                              onChange={(e) => handleUpdateProduct(prod.id, { name: e.target.value })}
                              className="font-black text-base text-[#2D2D24] bg-transparent border-b border-transparent hover:border-[#046A47] focus:border-[#046A47] focus:bg-emerald-50/20 px-1 py-0.5 rounded focus:outline-none transition-colors"
                              placeholder="اسم المنتج التجاري"
                            />

                            <select
                              value={prod.categoryId}
                              onChange={(e) => {
                                const matchedCat = categories.find((c) => c.id === e.target.value);
                                handleUpdateProduct(prod.id, {
                                  categoryId: e.target.value,
                                  categoryName: matchedCat?.name || prod.categoryName,
                                });
                              }}
                              className="text-xs font-bold text-[#046A47] bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <input
                            type="text"
                            value={prod.shortDescription}
                            onChange={(e) => handleUpdateProduct(prod.id, { shortDescription: e.target.value })}
                            className="text-xs text-[#5A5A40] w-full bg-transparent border-b border-transparent hover:border-[#D4D1C5] focus:border-[#046A47] focus:bg-emerald-50/20 px-1 py-0.5 rounded focus:outline-none transition-colors"
                            placeholder="وصف مختصر لوظيفة المنتج"
                          />
                        </div>
                      </div>

                      {/* Header Actions & Package Quick Overview */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <span className="text-xs font-bold bg-[#FAF8F5] border border-[#E5E2D9] px-2.5 py-1 rounded-lg text-[#2D2D24]">
                          {prod.packages.length} أحجام عبوات
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDuplicateProduct(prod)}
                          className="p-1.5 hover:bg-[#FAF8F5] text-[#5A5A40] rounded-lg transition-colors cursor-pointer"
                          title="تكرار هذا المنتج"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="حذف هذا المنتج من الجدول"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleExpand(prod.id)}
                          className="p-1.5 hover:bg-[#FAF8F5] text-[#2D2D24] rounded-lg transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Editable Body */}
                    {isExpanded && (
                      <div className="p-4 bg-[#FAF8F5]/50 space-y-4 text-xs">
                        {/* Technical Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Chemical Composition */}
                          <div className="bg-white p-3 rounded-xl border border-[#E5E2D9] space-y-1.5">
                            <label className="font-black text-[#2D2D24] block">
                              التركيب الكيميائي ونسب المواد الفعالة:
                            </label>
                            <textarea
                              rows={2}
                              value={prod.composition.join(' + ')}
                              onChange={(e) =>
                                handleUpdateProduct(prod.id, {
                                  composition: e.target.value.split('+').map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              placeholder="مثال: نيتروجين 20% + فسفور 20% + بوتاسيوم 20%"
                              className="w-full bg-[#FAF8F5] border border-[#D4D1C5] rounded-lg p-2 text-xs text-[#2D2D24] focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                            />
                          </div>

                          {/* Characteristics */}
                          <div className="bg-white p-3 rounded-xl border border-[#E5E2D9] space-y-1.5">
                            <label className="font-black text-[#2D2D24] block">
                              المميزات والخصائص:
                            </label>
                            <textarea
                              rows={2}
                              value={prod.characteristics.join(' ، ')}
                              onChange={(e) =>
                                handleUpdateProduct(prod.id, {
                                  characteristics: e.target.value.split('،').map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              placeholder="مثال: سريع الامتصاص ، خالي من الكلور ، يزيد حجم الثمار"
                              className="w-full bg-[#FAF8F5] border border-[#D4D1C5] rounded-lg p-2 text-xs text-[#2D2D24] focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                            />
                          </div>

                          {/* Usage & Rate */}
                          <div className="bg-white p-3 rounded-xl border border-[#E5E2D9] space-y-1.5">
                            <label className="font-black text-[#2D2D24] block">
                              معدل الاستخدام والتوصيات:
                            </label>
                            <textarea
                              rows={2}
                              value={prod.usage.join(' ، ')}
                              onChange={(e) =>
                                handleUpdateProduct(prod.id, {
                                  usage: e.target.value.split('،').map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              placeholder="مثال: 200 سم / 100 لتر ماء للخضر والفاكهة"
                              className="w-full bg-[#FAF8F5] border border-[#D4D1C5] rounded-lg p-2 text-xs text-[#2D2D24] focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                            />
                          </div>
                        </div>

                        {/* Packages & Prices Sub-Table */}
                        <div className="bg-white p-4 rounded-xl border border-[#E5E2D9] space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-[#2D2D24] flex items-center gap-1.5">
                              <DollarSign className="w-4 h-4 text-[#046A47]" />
                              <span>جدول أحجام العبوات والأسعار بالجنيه المصري</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleAddPackage(prod.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ إضافة عبوة جديدة للمنتج</span>
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="border-b border-[#E5E2D9] text-[#5A5A40]">
                                  <th className="pb-2 font-black">اسم وحجم العبوة</th>
                                  <th className="pb-2 font-black">الكمية والوحدة</th>
                                  <th className="pb-2 font-black">سعر البيع بالجنيه (EGP)</th>
                                  <th className="pb-2 font-black text-center">إجراء</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E2D9]">
                                {prod.packages.map((pkg, pIdx) => {
                                  return (
                                    <tr key={pIdx} className="hover:bg-[#FAF8F5]/60">
                                      <td className="py-2 pl-2">
                                        <input
                                          type="text"
                                          value={pkg.displayName}
                                          onChange={(e) =>
                                            handleUpdatePackage(prod.id, pIdx, { displayName: e.target.value })
                                          }
                                          className="w-full bg-[#FAF8F5] border border-[#D4D1C5] rounded-lg px-2.5 py-1.5 font-bold text-[#2D2D24] focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                                          placeholder="مثال: 1 لتر أو 5 لتر"
                                        />
                                      </td>
                                      <td className="py-2 px-2">
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            value={pkg.quantity}
                                            onChange={(e) =>
                                              handleUpdatePackage(prod.id, pIdx, { quantity: Number(e.target.value) })
                                            }
                                            className="w-16 bg-[#FAF8F5] border border-[#D4D1C5] rounded-lg px-2 py-1.5 text-center font-bold text-[#2D2D24] focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                                          />
                                          <input
                                            type="text"
                                            value={pkg.unit}
                                            onChange={(e) =>
                                              handleUpdatePackage(prod.id, pIdx, { unit: e.target.value })
                                            }
                                            className="w-14 bg-[#FAF8F5] border border-[#D4D1C5] rounded-lg px-1.5 py-1.5 text-center text-xs text-[#5A5A40] focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2 px-2">
                                        <div className="relative">
                                          <input
                                            type="number"
                                            value={pkg.price}
                                            onChange={(e) =>
                                              handleUpdatePackage(prod.id, pIdx, { price: Number(e.target.value) })
                                            }
                                            className="w-28 bg-[#FAF8F5] border border-[#D4D1C5] rounded-lg px-2.5 py-1.5 text-left font-black text-[#046A47] focus:outline-none focus:ring-1 focus:ring-[#046A47]"
                                          />
                                          <span className="text-[10px] text-[#5A5A40] mr-1 font-bold">ج.م</span>
                                        </div>
                                      </td>
                                      <td className="py-2 pr-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePackage(prod.id, pIdx)}
                                          disabled={prod.packages.length <= 1}
                                          className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                          title="حذف هذا الحجم"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Confirm Bar */}
          <div className="pt-4 border-t border-[#E5E2D9] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#5A5A40] font-bold">
              سيتم حفظ <strong>{selectedCount}</strong> منتج و <strong>{totalPackagesCount}</strong> عبوة وسعر في قاعدة بيانات شركة <strong>{selectedCompany?.name}</strong>.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={selectedCount === 0}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#046A47] hover:bg-[#035136] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>اعتماد وحفظ الكتالوج المستخرج في النظام الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Price Adjustment Modal */}
      {isPriceAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#E5E2D9] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
              <h3 className="font-black text-sm text-[#2D2D24] flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#046A47]" />
                <span>تعديل جماعي للأسعار المستخرجة</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPriceAdjustModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5A5A40]">
              يمكنك تطبيق تعديل نسبة مئوية سريعة على جميع أسعار العبوات المستخرجة بالجدول (مثلا في حال تحديث الكتالوج بزيادة معينة).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">النوع:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceAdjustMode('increase')}
                    className={`py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      priceAdjustMode === 'increase'
                        ? 'bg-[#046A47] text-white shadow-xs'
                        : 'bg-[#FAF8F5] border border-[#D4D1C5] text-[#2D2D24]'
                    }`}
                  >
                    + زيادة الأسعار
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceAdjustMode('decrease')}
                    className={`py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      priceAdjustMode === 'decrease'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-[#FAF8F5] border border-[#D4D1C5] text-[#2D2D24]'
                    }`}
                  >
                    - خصم أو تخفيض
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">النسبة المئوية (%):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={priceAdjustPercent}
                    onChange={(e) => setPriceAdjustPercent(Number(e.target.value))}
                    className="w-full bg-[#FAF8F5] border border-[#D4D1C5] rounded-xl px-3 py-2 text-sm font-black text-[#2D2D24] focus:outline-none focus:ring-2 focus:ring-[#046A47]"
                  />
                  <span className="text-sm font-black text-[#2D2D24]">%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPriceAdjustModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#2D2D24] rounded-xl text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPriceAdjustment}
                className="px-4 py-2 bg-[#046A47] hover:bg-[#035136] text-white rounded-xl text-xs font-black cursor-pointer"
              >
                تطبيق التعديل على الجدول
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Picker Modal for a specific product */}
      {activeImagePickerProductId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E5E2D9] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E2D9]">
              <h3 className="font-black text-sm text-[#2D2D24] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#046A47]" />
                <span>اختيار أو تغيير صورة المنتج</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveImagePickerProductId(null)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* One-click Agricultural Product Preset Gallery */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#2D2D24] block">
                اختر صورة جاهزة بضغطة واحدة (عبوات وأسمدة ومبيدات زراعية):
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-[#FAF8F5] rounded-xl border border-[#E5E2D9]">
                {AGRICULTURAL_PRESET_IMAGES.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      handleUpdateProduct(activeImagePickerProductId, { imageUrl: img.url });
                      setActiveImagePickerProductId(null);
                      onShowToast(`تم اختيار صورة ${img.name}`, 'success');
                    }}
                    className="flex flex-col items-center gap-1 p-1 rounded-lg border border-[#D4D1C5] hover:border-[#046A47] hover:bg-emerald-50/50 transition-all cursor-pointer group"
                    title={img.name}
                  >
                    <div className="w-full aspect-square rounded-md overflow-hidden bg-white">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <span className="text-[10px] font-bold text-[#5A5A40] truncate max-w-full">
                      {img.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Image Upload or URL */}
            <div className="space-y-2 pt-2 border-t border-[#E5E2D9]">
              <label className="text-xs font-bold text-[#2D2D24] block">أو رفع صورة خاصة من جهازك:</label>
              <ImageFileInput
                value={
                  extractionResult?.products.find((p) => p.id === activeImagePickerProductId)?.imageUrl || ''
                }
                onChange={(newUrl) => {
                  handleUpdateProduct(activeImagePickerProductId, { imageUrl: newUrl });
                  setActiveImagePickerProductId(null);
                  onShowToast('تم تحديث صورة المنتج', 'success');
                }}
                label="صورة العبوة أو المنتج"
              />
            </div>

            {/* Gallery Images of this company */}
            {relevantCompanyImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E5E2D9]">
                <label className="text-xs font-bold text-[#2D2D24] block">
                  أو اختر من معرض صور الشركة ({relevantCompanyImages.length} صور متاحة):
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                  {relevantCompanyImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        handleUpdateProduct(activeImagePickerProductId, { imageUrl: img.url });
                        setActiveImagePickerProductId(null);
                        onShowToast('تم اختيار الصورة من معرض الشركة', 'success');
                      }}
                      className="aspect-square rounded-xl border border-[#D4D1C5] hover:border-[#046A47] hover:scale-105 transition-all overflow-hidden cursor-pointer"
                    >
                      <img src={img.url} alt={img.altText || 'img'} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
