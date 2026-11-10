import * as XLSX from 'xlsx';
import { dbStorage } from './dbStorage';

export interface ExcelRowItem {
  productId: string;
  productName: string;
  packageId: string;
  packageSize: number | string;
  unit: string;
  price: number;
  currency: string;
  active: boolean | string;
}

export interface ChangeDiffItem {
  row: number;
  productId: string;
  productName: string;
  packageId: string;
  packageName: string;
  oldPrice: number;
  newPrice: number;
  status: 'changed' | 'unchanged' | 'error';
  errorReason?: string;
}

export interface ImportAnalysisResult {
  sheetName: string;
  totalRows: number;
  validRows: number;
  changedRows: number;
  unchangedRows: number;
  errorRows: number;
  changes: ChangeDiffItem[];
  errors: { row: number; productId?: string; packageId?: string; message: string }[];
  validUpdates: { productId: string; packageId: string; newPrice: number }[];
}

export const excelService = {
  // Download official Excel template
  downloadTemplate(companyName: string = 'كروپسا'): void {
    const products = dbStorage.getProducts();
    const packages = dbStorage.getPackages();

    const templateData = products.flatMap((product) => {
      const productPackages = packages.filter((pkg) => pkg.productId === product.id);
      if (productPackages.length === 0) {
        return [
          {
            'Product ID': product.id,
            'Product Name': product.name,
            'Package ID': `${product.id}-1L`,
            'Package Size': 1,
            'Unit': 'لتر',
            'Price': 200,
            'Currency': 'EGP',
            'Active': 'TRUE',
          },
        ];
      }
      return productPackages.map((pkg) => ({
        'Product ID': product.id,
        'Product Name': product.name,
        'Package ID': pkg.id,
        'Package Size': pkg.quantity,
        'Unit': pkg.unit,
        'Price': pkg.price,
        'Currency': pkg.currency || 'EGP',
        'Active': pkg.active ? 'TRUE' : 'FALSE',
      }));
    });

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'أسعار_المنتجات');

    // Auto fit column widths
    const colWidths = [
      { wch: 15 }, // Product ID
      { wch: 30 }, // Product Name
      { wch: 20 }, // Package ID
      { wch: 12 }, // Package Size
      { wch: 10 }, // Unit
      { wch: 12 }, // Price
      { wch: 10 }, // Currency
      { wch: 10 }, // Active
    ];
    worksheet['!cols'] = colWidths;

    const fileName = `نموذج_أسعار_CROPSA_${companyName.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  },

  // Parse and analyze uploaded Excel file
  async analyzeExcelFile(file: File): Promise<ImportAnalysisResult[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const existingProducts = dbStorage.getProducts();
          const existingPackages = dbStorage.getPackages();

          const results: ImportAnalysisResult[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

            if (rawRows.length === 0) return;

            const changes: ChangeDiffItem[] = [];
            const errors: { row: number; productId?: string; packageId?: string; message: string }[] = [];
            const validUpdates: { productId: string; packageId: string; newPrice: number }[] = [];

            let changedRows = 0;
            let unchangedRows = 0;
            let errorRows = 0;

            rawRows.forEach((row, index) => {
              const rowIndex = index + 2; // Excel row numbering starts at 2 (1 is header)

              // Normalize column keys
              const productId = String(
                row['Product ID'] || row['كود المنتج'] || row['رمز المنتج'] || row['productId'] || ''
              ).trim();
              const productName = String(
                row['Product Name'] || row['اسم المنتج'] || row['productName'] || ''
              ).trim();
              const packageId = String(
                row['Package ID'] || row['كود العبوة'] || row['رمز العبوة'] || row['packageId'] || ''
              ).trim();
              const rawPrice = row['Price'] || row['السعر'] || row['price'];

              const newPrice = parseFloat(rawPrice);

              // Validation rules
              if (!productId) {
                errors.push({ row: rowIndex, message: 'كود المنتج (Product ID) مفقود' });
                changes.push({
                  row: rowIndex,
                  productId: '-',
                  productName: productName || '-',
                  packageId: packageId || '-',
                  packageName: '-',
                  oldPrice: 0,
                  newPrice: isNaN(newPrice) ? 0 : newPrice,
                  status: 'error',
                  errorReason: 'كود المنتج مفقود',
                });
                errorRows++;
                return;
              }

              const matchedProduct = existingProducts.find((p) => p.id.toUpperCase() === productId.toUpperCase());
              if (!matchedProduct) {
                errors.push({ row: rowIndex, productId, message: `كود المنتج "${productId}" غير موجود بالنظام` });
                changes.push({
                  row: rowIndex,
                  productId,
                  productName: productName || '-',
                  packageId: packageId || '-',
                  packageName: '-',
                  oldPrice: 0,
                  newPrice: isNaN(newPrice) ? 0 : newPrice,
                  status: 'error',
                  errorReason: 'كود المنتج غير موجود في قاعدة البيانات',
                });
                errorRows++;
                return;
              }

              if (!packageId) {
                errors.push({ row: rowIndex, productId, message: 'كود العبوة (Package ID) مفقود' });
                changes.push({
                  row: rowIndex,
                  productId,
                  productName: matchedProduct.name,
                  packageId: '-',
                  packageName: '-',
                  oldPrice: 0,
                  newPrice: isNaN(newPrice) ? 0 : newPrice,
                  status: 'error',
                  errorReason: 'كود العبوة مفقود',
                });
                errorRows++;
                return;
              }

              const matchedPackage = existingPackages.find(
                (pkg) => pkg.id.toUpperCase() === packageId.toUpperCase() || (pkg.productId === matchedProduct.id && pkg.id === packageId)
              );

              if (!matchedPackage) {
                errors.push({ row: rowIndex, productId, packageId, message: `كود العبوة "${packageId}" غير مسجل لهذا المنتج` });
                changes.push({
                  row: rowIndex,
                  productId,
                  productName: matchedProduct.name,
                  packageId,
                  packageName: '-',
                  oldPrice: 0,
                  newPrice: isNaN(newPrice) ? 0 : newPrice,
                  status: 'error',
                  errorReason: 'العبوة غير مسجلة لهذا المنتج',
                });
                errorRows++;
                return;
              }

              if (isNaN(newPrice) || newPrice < 0) {
                errors.push({ row: rowIndex, productId, packageId, message: `السعر "${rawPrice}" غير صالح` });
                changes.push({
                  row: rowIndex,
                  productId,
                  productName: matchedProduct.name,
                  packageId,
                  packageName: matchedPackage.displayName,
                  oldPrice: matchedPackage.price,
                  newPrice: 0,
                  status: 'error',
                  errorReason: 'قيمة السعر غير صالحة',
                });
                errorRows++;
                return;
              }

              const isPriceChanged = matchedPackage.price !== newPrice;

              if (isPriceChanged) {
                changedRows++;
                validUpdates.push({
                  productId: matchedProduct.id,
                  packageId: matchedPackage.id,
                  newPrice,
                });
                changes.push({
                  row: rowIndex,
                  productId: matchedProduct.id,
                  productName: matchedProduct.name,
                  packageId: matchedPackage.id,
                  packageName: matchedPackage.displayName,
                  oldPrice: matchedPackage.price,
                  newPrice,
                  status: 'changed',
                });
              } else {
                unchangedRows++;
                changes.push({
                  row: rowIndex,
                  productId: matchedProduct.id,
                  productName: matchedProduct.name,
                  packageId: matchedPackage.id,
                  packageName: matchedPackage.displayName,
                  oldPrice: matchedPackage.price,
                  newPrice,
                  status: 'unchanged',
                });
              }
            });

            results.push({
              sheetName,
              totalRows: rawRows.length,
              validRows: changedRows + unchangedRows,
              changedRows,
              unchangedRows,
              errorRows,
              changes,
              errors,
              validUpdates,
            });
          });

          resolve(results);
        } catch (err) {
          reject(new Error('فشل في قراءة ملف الإكسيل. يرجى التأكد من صلاحة امتداد وصيغة الملف.'));
        }
      };

      reader.onerror = () => reject(new Error('خطأ أثناء رفع الملف.'));
      reader.readAsArrayBuffer(file);
    });
  },
};
