import * as XLSX from 'xlsx';
import { Company, Product, Package, Category, CompanySubCategory } from '../types';

export interface CompanyExcelRow {
  'كود المنتج (ID)': string;
  'اسم المنتج': string;
  'القسم الرئيسي': string;
  'القسم الفرعي': string;
  'نوع المركب': string;
  'المادة الفعالة والتركيب': string;
  'الوصف المختصر': string;
  'طريقة الاستخدام والجرعة': string;
  'حالة المنتج': string;
  'كود العبوة (Package ID)': string;
  'اسم العبوة': string;
  'حجم العبوة': number | string;
  'الوحدة': string;
  'سعر العبوة (جنيه)': number | string;
  'عدد العبوات في الكرتونة': number | string;
  'حالة العبوة': string;
  'رابط الصورة': string;
}

export interface CompanyPriceChange {
  productId: string;
  productName: string;
  packageId: string;
  packageName: string;
  oldPrice: number;
  newPrice: number;
}

export interface CompanyExcelAnalysisResult {
  totalRows: number;
  productsToUpdateCount: number;
  packagesToUpdateCount: number;
  newProductsCount: number;
  newPackagesCount: number;
  updatedProductsList: Product[];
  updatedPackagesList: Package[];
  priceChanges: CompanyPriceChange[];
  errors: string[];
  warnings: string[];
}

/**
 * Safely sanitizes text intended for an Excel cell so it never exceeds 
 * the ECMA-376 / Microsoft Excel specification hard limit of 32,767 characters per cell.
 * Replaces massive raw base64 data URLs with a clean placeholder.
 */
function safeCellText(val: any, maxLen: number = 32000): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s.startsWith('data:image/') || s.length > maxLen) {
    if (s.startsWith('data:image/')) {
      return '[صورة داخلية مدمجة Base64]';
    }
    return s.substring(0, maxLen);
  }
  return s;
}

export const companyExcelService = {
  /**
   * Export all products and packages of a specific company to a clean, formatted Excel sheet.
   */
  exportCompanyProductsToExcel(
    company: Company,
    products: Product[],
    packages: Package[],
    categories: Category[] = [],
    subCategories: CompanySubCategory[] = []
  ): void {
    const compProducts = products.filter((p) => p.companyId === company.id);

    if (compProducts.length === 0) {
      // Export template with 1 sample row if company has no products yet
      const sampleRow: CompanyExcelRow = {
        'كود المنتج (ID)': `${company.slug ? company.slug.toUpperCase() : 'PRD'}-001`,
        'اسم المنتج': 'اسم المركب الجديد',
        'القسم الرئيسي': categories[0]?.name || 'أسمدة ومخصبات ورقية',
        'القسم الفرعي': subCategories.find((s) => s.companyId === company.id)?.name || 'أسمدة NPK بودر',
        'نوع المركب': 'سماد بودر',
        'المادة الفعالة والتركيب': 'نيتروجين 20% | فوسفور 20% | بوتاسيوم 20%',
        'الوصف المختصر': 'مركب عالي الجودة والفاعلية لتغذية النبات وتحسين الإنتاجية',
        'طريقة الاستخدام والجرعة': 'رش ورقي بمعدل 2 جرام لكل لتر ماء',
        'حالة المنتج': 'نشط',
        'كود العبوة (Package ID)': `${company.slug ? company.slug.toUpperCase() : 'PRD'}-001-PKG-1`,
        'اسم العبوة': '1 كجم',
        'حجم العبوة': 1,
        'الوحدة': 'كجم',
        'سعر العبوة (جنيه)': 150,
        'عدد العبوات في الكرتونة': 12,
        'حالة العبوة': 'نشط',
        'رابط الصورة': '',
      };

      const ws = XLSX.utils.json_to_sheet([sampleRow]);
      ws['!cols'] = [
        { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 20 }, { wch: 15 },
        { wch: 35 }, { wch: 40 }, { wch: 35 }, { wch: 12 }, { wch: 22 },
        { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 22 },
        { wch: 12 }, { wch: 30 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'منتجات_الشركة');
      const filename = `نموذج_منتجات_${company.name.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, filename);
      return;
    }

    const rows: CompanyExcelRow[] = compProducts.flatMap((prod) => {
      const prodPkgs = packages.filter((pkg) => pkg.productId === prod.id);
      const cat = categories.find((c) => c.id === prod.categoryId);
      const sub = subCategories.find((s) => s.id === prod.subCategoryId);

      let typeLabel = 'سماد';
      if (prod.productType === 'pesticide') typeLabel = 'مبيد مكافحة';
      else if (prod.productType === 'stimulant') typeLabel = 'مخصب ومحفز نمو';

      if (prodPkgs.length === 0) {
        return [
          {
            'كود المنتج (ID)': prod.id,
            'اسم المنتج': prod.name,
            'القسم الرئيسي': cat?.name || 'غير محدد',
            'القسم الفرعي': sub?.name || '-',
            'نوع المركب': typeLabel,
            'المادة الفعالة والتركيب': (prod.composition || []).join(' | '),
            'الوصف المختصر': prod.shortDescription || prod.description || '',
            'طريقة الاستخدام والجرعة': (prod.usage || []).join(' | '),
            'حالة المنتج': prod.active ? 'نشط' : 'معطل',
            'كود العبوة (Package ID)': `${prod.id}-PKG-1`,
            'اسم العبوة': 'عبوة قياسية',
            'حجم العبوة': 1,
            'الوحدة': 'قطعة',
            'سعر العبوة (جنيه)': 0,
            'عدد العبوات في الكرتونة': prod.piecesPerCarton || 12,
            'حالة العبوة': 'نشط',
            'رابط الصورة': safeCellText(prod.mainImageUrl),
          },
        ];
      }

      return prodPkgs.map((pkg) => ({
        'كود المنتج (ID)': prod.id,
        'اسم المنتج': prod.name,
        'القسم الرئيسي': cat?.name || 'غير محدد',
        'القسم الفرعي': sub?.name || '-',
        'نوع المركب': typeLabel,
        'المادة الفعالة والتركيب': (prod.composition || []).join(' | '),
        'الوصف المختصر': prod.shortDescription || prod.description || '',
        'طريقة الاستخدام والجرعة': (prod.usage || []).join(' | '),
        'حالة المنتج': prod.active ? 'نشط' : 'معطل',
        'كود العبوة (Package ID)': pkg.id,
        'اسم العبوة': pkg.displayName,
        'حجم العبوة': pkg.quantity,
        'الوحدة': pkg.unit,
        'سعر العبوة (جنيه)': pkg.price,
        'عدد العبوات في الكرتونة': pkg.piecesPerCarton || prod.piecesPerCarton || 12,
        'حالة العبوة': pkg.active ? 'نشط' : 'معطل',
        'رابط الصورة': safeCellText(prod.mainImageUrl),
      }));
    });

    const sanitizedRows = rows.map((r) => {
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(r)) {
        clean[k] = typeof v === 'string' ? safeCellText(v) : v;
      }
      return clean;
    });

    const worksheet = XLSX.utils.json_to_sheet(sanitizedRows);
    worksheet['!cols'] = [
      { wch: 18 }, // كود المنتج
      { wch: 25 }, // اسم المنتج
      { wch: 22 }, // القسم الرئيسي
      { wch: 20 }, // القسم الفرعي
      { wch: 15 }, // نوع المركب
      { wch: 35 }, // المادة الفعالة والتركيب
      { wch: 40 }, // الوصف المختصر
      { wch: 35 }, // الاستخدام والجرعة
      { wch: 12 }, // حالة المنتج
      { wch: 22 }, // كود العبوة
      { wch: 15 }, // اسم العبوة
      { wch: 12 }, // حجم العبوة
      { wch: 10 }, // الوحدة
      { wch: 16 }, // سعر العبوة
      { wch: 22 }, // عدد العبوات في الكرتونة
      { wch: 12 }, // حالة العبوة
      { wch: 35 }, // رابط الصورة
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = company.name.slice(0, 28).replace(/[\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `منتجات_شركة_${company.name.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, filename);
  },

  /**
   * Parse an uploaded Excel file for a company and prepare all updates, additions, and price changes.
   */
  async parseAndAnalyzeCompanyExcel(
    file: File,
    company: Company,
    allProducts: Product[],
    allPackages: Package[],
    categories: Category[] = [],
    subCategories: CompanySubCategory[] = []
  ): Promise<CompanyExcelAnalysisResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('ملف الإكسيل فارغ أو لا يحتوي على أوراق عمل.'));
            return;
          }

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

          if (rawRows.length === 0) {
            reject(new Error('ورقة العمل لا تحتوي على بيانات منتجات.'));
            return;
          }

          // Working copies of collections
          let workingProducts = [...allProducts];
          let workingPackages = [...allPackages];
          const companySubs = subCategories.filter((s) => s.companyId === company.id);

          const priceChanges: CompanyPriceChange[] = [];
          const errors: string[] = [];
          const warnings: string[] = [];

          let updatedProductsSet = new Set<string>();
          let updatedPackagesSet = new Set<string>();
          let newProductsCount = 0;
          let newPackagesCount = 0;

          rawRows.forEach((row, index) => {
            const rowIndex = index + 2;

            // Extract values with flexible column aliases
            const rawProdId = String(
              row['كود المنتج (ID)'] ||
              row['كود المنتج'] ||
              row['Product ID'] ||
              row['productId'] ||
              row['كود'] ||
              ''
            ).trim();

            const rawProdName = String(
              row['اسم المنتج'] ||
              row['Product Name'] ||
              row['productName'] ||
              row['المنتج'] ||
              ''
            ).trim();

            if (!rawProdName && !rawProdId) {
              return; // skip empty rows
            }

            const rawCatName = String(row['القسم الرئيسي'] || row['Category'] || '').trim();
            const rawSubName = String(row['القسم الفرعي'] || row['SubCategory'] || '').trim();
            const rawType = String(row['نوع المركب'] || row['Product Type'] || '').trim();
            const rawComposition = String(
              row['المادة الفعالة والتركيب'] ||
              row['Active Ingredients'] ||
              row['التركيب'] ||
              row['المادة الفعالة'] ||
              ''
            ).trim();
            const rawShortDesc = String(row['الوصف المختصر'] || row['Short Description'] || '').trim();
            const rawUsage = String(row['طريقة الاستخدام والجرعة'] || row['Usage'] || row['الاستخدام'] || '').trim();
            const rawProdActive = String(row['حالة المنتج'] || row['Product Active'] || row['نشط'] || 'نشط').trim();

            const rawPkgId = String(
              row['كود العبوة (Package ID)'] ||
              row['كود العبوة'] ||
              row['Package ID'] ||
              row['packageId'] ||
              ''
            ).trim();

            const rawPkgName = String(
              row['اسم العبوة'] ||
              row['Package Name'] ||
              row['العبوة'] ||
              '1 لتر'
            ).trim();

            const rawPkgSize = parseFloat(String(row['حجم العبوة'] || row['Package Size'] || row['الحجم'] || 1));
            const rawPkgUnit = String(row['الوحدة'] || row['Unit'] || 'لتر').trim();
            const rawPrice = parseFloat(String(row['سعر العبوة (جنيه)'] || row['سعر العبوة'] || row['السعر'] || row['Price'] || 0));
            const rawCartonPieces = parseInt(String(row['عدد العبوات في الكرتونة'] || row['Pieces Per Carton'] || row['كرتونة'] || 12), 10);
            const rawPkgActive = String(row['حالة العبوة'] || row['Package Active'] || 'نشط').trim();
            const rawImgUrl = String(row['رابط الصورة'] || row['Image URL'] || '').trim();
            const isPlaceholderImg = !rawImgUrl || rawImgUrl.includes('[صورة') || rawImgUrl.includes('Base64');

            const isProdActive = !/^(معطل|لا|false|0|غير نشط|inactive)$/i.test(rawProdActive);
            const isPkgActive = !/^(معطل|لا|false|0|غير نشط|inactive)$/i.test(rawPkgActive);

            // Determine category and subcategory IDs
            let categoryId = categories[0]?.id || 'CAT-01';
            if (rawCatName) {
              const matchedCat = categories.find(
                (c) => c.name.toLowerCase() === rawCatName.toLowerCase() || c.id === rawCatName
              );
              if (matchedCat) categoryId = matchedCat.id;
            }

            let subCategoryId: string | undefined = undefined;
            if (rawSubName && rawSubName !== '-') {
              const matchedSub = companySubs.find(
                (s) => s.name.toLowerCase() === rawSubName.toLowerCase() || s.id === rawSubName
              );
              if (matchedSub) {
                subCategoryId = matchedSub.id;
              }
            }

            // Determine Product Type
            let productType: Product['productType'] = 'fertilizer';
            if (/مبيد|pesticide/i.test(rawType)) {
              productType = 'pesticide';
            } else if (/مخصب|محفز|stimulant/i.test(rawType)) {
              productType = 'stimulant';
            }

            // Parse Composition & Usage arrays (split by | or commas or newlines)
            const compositionArray = rawComposition
              ? rawComposition.split(/[|\n،,]/).map((s) => s.trim()).filter(Boolean)
              : [];
            const usageArray = rawUsage
              ? rawUsage.split(/[|\n،,]/).map((s) => s.trim()).filter(Boolean)
              : [];

            // 1. MATCH OR CREATE PRODUCT
            let matchedProduct = workingProducts.find(
              (p) =>
                (rawProdId && p.id.toUpperCase() === rawProdId.toUpperCase()) ||
                (rawProdName && p.companyId === company.id && p.name.trim().toLowerCase() === rawProdName.toLowerCase())
            );

            if (!matchedProduct) {
              // Create New Product
              const newProdId = rawProdId || `${company.slug ? company.slug.toUpperCase() : 'PRD'}-${Date.now().toString().slice(-4)}-${index + 1}`;
              matchedProduct = {
                id: newProdId,
                companyId: company.id,
                categoryId,
                subCategoryId,
                productType,
                name: rawProdName || `منتج ${index + 1}`,
                shortDescription: rawShortDesc || 'مركب زراعي عالي الجودة والفاعلية',
                description: rawShortDesc || '',
                characteristics: [],
                composition: compositionArray,
                usage: usageArray,
                mainImageUrl: !isPlaceholderImg ? rawImgUrl : 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=600&auto=format&fit=crop&q=80',
                displayOrder: workingProducts.length + 1,
                active: isProdActive,
                allowPieceOrder: true,
                allowCartonOrder: Boolean(rawCartonPieces && rawCartonPieces > 1),
                piecesPerCarton: isNaN(rawCartonPieces) ? 12 : rawCartonPieces,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              workingProducts.push(matchedProduct);
              newProductsCount++;
              updatedProductsSet.add(matchedProduct.id);
            } else {
              // Update Existing Product
              const updated: Product = {
                ...matchedProduct,
                name: rawProdName || matchedProduct.name,
                companyId: company.id,
                categoryId: categoryId || matchedProduct.categoryId,
                subCategoryId: subCategoryId !== undefined ? subCategoryId : matchedProduct.subCategoryId,
                productType: productType || matchedProduct.productType,
                shortDescription: rawShortDesc || matchedProduct.shortDescription,
                description: rawShortDesc || matchedProduct.description,
                composition: compositionArray.length > 0 ? compositionArray : matchedProduct.composition,
                usage: usageArray.length > 0 ? usageArray : matchedProduct.usage,
                active: isProdActive,
                piecesPerCarton: !isNaN(rawCartonPieces) && rawCartonPieces > 0 ? rawCartonPieces : matchedProduct.piecesPerCarton,
                mainImageUrl: !isPlaceholderImg ? rawImgUrl : matchedProduct.mainImageUrl,
                updatedAt: new Date().toISOString(),
              };
              workingProducts = workingProducts.map((p) => (p.id === matchedProduct!.id ? updated : p));
              matchedProduct = updated;
              updatedProductsSet.add(matchedProduct.id);
            }

            // 2. MATCH OR CREATE PACKAGE
            if (rawPkgName || rawPrice > 0 || rawPkgId) {
              let matchedPkg = workingPackages.find(
                (pkg) =>
                  (rawPkgId && pkg.id.toUpperCase() === rawPkgId.toUpperCase()) ||
                  (pkg.productId === matchedProduct!.id && pkg.displayName.trim().toLowerCase() === rawPkgName.toLowerCase())
              );

              const safePrice = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
              const safeSize = isNaN(rawPkgSize) || rawPkgSize <= 0 ? 1 : rawPkgSize;
              const safeCarton = isNaN(rawCartonPieces) || rawCartonPieces <= 0 ? 12 : rawCartonPieces;

              if (!matchedPkg) {
                // Create New Package
                const newPkgId = rawPkgId || `${matchedProduct.id}-PKG-${Date.now().toString().slice(-4)}-${index + 1}`;
                matchedPkg = {
                  id: newPkgId,
                  productId: matchedProduct.id,
                  displayName: rawPkgName || '1 عبوة',
                  quantity: safeSize,
                  unit: rawPkgUnit || 'لتر',
                  price: safePrice,
                  currency: 'جنيه',
                  allowPieceOrder: true,
                  allowCartonOrder: safeCarton > 1,
                  piecesPerCarton: safeCarton,
                  active: isPkgActive,
                  displayOrder: 1,
                };
                workingPackages.push(matchedPkg);
                newPackagesCount++;
                updatedPackagesSet.add(matchedPkg.id);
              } else {
                // Price Change Detection
                if (safePrice > 0 && matchedPkg.price !== safePrice) {
                  priceChanges.push({
                    productId: matchedProduct.id,
                    productName: matchedProduct.name,
                    packageId: matchedPkg.id,
                    packageName: matchedPkg.displayName,
                    oldPrice: matchedPkg.price,
                    newPrice: safePrice,
                  });
                }

                // Update Existing Package
                const updatedPkg: Package = {
                  ...matchedPkg,
                  displayName: rawPkgName || matchedPkg.displayName,
                  quantity: safeSize,
                  unit: rawPkgUnit || matchedPkg.unit,
                  price: safePrice > 0 ? safePrice : matchedPkg.price,
                  piecesPerCarton: safeCarton,
                  active: isPkgActive,
                };
                workingPackages = workingPackages.map((pkg) => (pkg.id === matchedPkg!.id ? updatedPkg : pkg));
                updatedPackagesSet.add(matchedPkg.id);
              }
            }
          });

          resolve({
            totalRows: rawRows.length,
            productsToUpdateCount: updatedProductsSet.size,
            packagesToUpdateCount: updatedPackagesSet.size,
            newProductsCount,
            newPackagesCount,
            updatedProductsList: workingProducts,
            updatedPackagesList: workingPackages,
            priceChanges,
            errors,
            warnings,
          });
        } catch (err: any) {
          reject(new Error(err?.message || 'حدث خطأ أثناء قراءة ملف الإكسيل.'));
        }
      };

      reader.onerror = () => reject(new Error('تعذر رفع وقراءة الملف.'));
      reader.readAsArrayBuffer(file);
    });
  },
};
