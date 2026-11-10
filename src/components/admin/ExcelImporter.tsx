import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, RefreshCw, Check, X, ArrowRight } from 'lucide-react';
import { excelService, ImportAnalysisResult, ChangeDiffItem } from '../../services/excelService';
import { Company } from '../../types';

interface ExcelImporterProps {
  companies: Company[];
  onBatchUpdatePrices: (
    updates: { productId: string; packageId: string; newPrice: number }[],
    source: 'excel',
    updatedBy: string
  ) => { updatedCount: number; errors: string[] };
  onAddImportLog: (log: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({
  companies,
  onBatchUpdatePrices,
  onAddImportLog,
  onShowToast,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies.length > 0 ? companies[0].id : '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<ImportAnalysisResult[] | null>(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [isCommitted, setIsCommitted] = useState(false);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const handleDownloadTemplate = () => {
    excelService.downloadTemplate(selectedCompany ? selectedCompany.name : 'كروپسا');
    onShowToast('تم تحميل نموذج ملف الأسعار الإكسيل', 'success');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsAnalyzing(true);
    setAnalysisResults(null);
    setIsCommitted(false);

    try {
      const results = await excelService.analyzeExcelFile(file);
      setAnalysisResults(results);
      setSelectedSheetIndex(0);
      onShowToast(`تم فحص وتحليل الملف بنجاح (${results[0]?.totalRows || 0} صف)`, 'success');
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء تحليل ملف الإكسيل');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentResult = analysisResults ? analysisResults[selectedSheetIndex] : null;

  const handleConfirmImport = () => {
    if (!currentResult || currentResult.validUpdates.length === 0) {
      alert('لا توجد أسعار محدثة صالحة للتأكيد والاستيراد');
      return;
    }

    const { updatedCount, errors } = onBatchUpdatePrices(currentResult.validUpdates, 'excel', 'المدير العام');

    onAddImportLog({
      fileName: 'أسعار_' + (selectedCompany ? selectedCompany.name : 'عام') + '.xlsx',
      companyId: selectedCompanyId,
      totalRows: currentResult.totalRows,
      successfulRows: currentResult.validRows,
      updatedRows: currentResult.changedRows,
      newRows: 0,
      errorRows: currentResult.errorRows,
      errors: currentResult.errors,
      uploadedBy: 'المدير العام',
    });

    setIsCommitted(true);
    onShowToast(`تم تحديث أسعار ${updatedCount} عبوات بالنظام فورياً!`, 'success');
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#046A47]" />
            <span>استيراد وتحديث الأسعار من ملفات إكسيل</span>
          </h2>
          <p className="text-xs text-[#5A5A40] font-medium">تحديث قائمة أسعار المنتجات والعبوات آلياً بالاعتماد على كود العبوة والشركة المصنعة</p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="bg-[#E5E2D9] hover:bg-[#D4D1C5] text-[#2D2D24] border border-[#D4D1C5] font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#046A47]" />
          <span>تحميل نموذج Excel المعتمد</span>
        </button>
      </div>

      {/* Explicit Company Selector Card */}
      <div className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#2D2D24] block">تحديد الشركة المصنعة الموجه لها شيت الأسعار: *</label>
          <p className="text-[11px] text-[#5A5A40]">يضمن توجيه تحديثات الأسعار بدقة إلى السجل الخاص بهذه الشركة</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#D4D1C5] w-full sm:w-auto">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-transparent text-[#2D2D24] font-black text-xs rounded-xl px-3 py-1.5 focus:outline-none w-full"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                شركة: {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Selection Banner */}
      {selectedCompany && (
        <div className="bg-[#046A47] text-white p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl p-1 flex items-center justify-center shrink-0">
              {selectedCompany.logoUrl ? (
                <img src={selectedCompany.logoUrl} alt={selectedCompany.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[#046A47] font-black text-lg">🏢</span>
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-[#A8CFC0] block">مستهدف رفع الشيت الحقيقي:</span>
              <span className="text-base font-black text-white">تحديث سجل وأسعار شركة: {selectedCompany.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div className="bg-[#FAF8F5] p-8 rounded-3xl border-2 border-dashed border-[#D4D1C5] hover:border-[#5A5A40] transition-colors text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 bg-[#E5E2D9] text-[#5A5A40] rounded-full flex items-center justify-center mx-auto">
          <Upload className="w-8 h-8" />
        </div>

        <div>
          <h3 className="font-bold text-[#2D2D24] text-base">اختر أو اسحب ملف Excel بحجم وسعر العبوات</h3>
          <p className="text-xs text-[#8A8A6D] mt-1">يدعم ملفات بصيغة (.xlsx, .xls) لشركة محددة أو شيتات متعددة</p>
        </div>

        <div className="pt-2 flex justify-center">
          <label className="bg-[#5A5A40] hover:bg-[#484833] text-[#F9F8F6] font-bold text-xs px-6 py-3 rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span>تحديد ملف من الجهاز</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {isAnalyzing && (
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#5A5A40] pt-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>جاري فحص وتدقيق الصفوف وأكواد العبوات...</span>
          </div>
        )}
      </div>

      {/* Analysis Results View */}
      {currentResult && (
        <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-6 animate-in fade-in">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-[#E5E2D9]/50 border border-[#D4D1C5] rounded-2xl text-center">
              <span className="text-xs text-[#5A5A40] font-bold block">إجمالي الصفوف بالملف</span>
              <span className="text-2xl font-black text-[#2D2D24]">{currentResult.totalRows}</span>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center">
              <span className="text-xs text-blue-800 font-bold block">عبوات يتغير سعرها</span>
              <span className="text-2xl font-black text-blue-900">{currentResult.changedRows}</span>
            </div>
            <div className="p-4 bg-[#F1EFEC] border border-[#D4D1C5] rounded-2xl text-center">
              <span className="text-xs text-[#8A8A6D] font-bold block">أسعار بدون تغيير</span>
              <span className="text-2xl font-black text-[#2D2D24]">{currentResult.unchangedRows}</span>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
              <span className="text-xs text-red-800 font-bold block">صفوف بها أخطاء</span>
              <span className="text-2xl font-black text-red-900">{currentResult.errorRows}</span>
            </div>
          </div>

          {/* Confirm Button Bar */}
          <div className="flex items-center justify-between p-4 bg-[#2D2D24] text-[#F9F8F6] rounded-2xl">
            <div>
              <span className="font-bold text-sm block">
                {isCommitted ? '✅ تم اعتماد واستيراد الأسعار بنجاح!' : 'معاينة تغييرات الأسعار قبل الاعتماد'}
              </span>
              <span className="text-xs text-[#D4D1C5]">
                سيتم تحديث قاعدة البيانات فورياً وتحديث الأسعار بالكتالوج الرقمي للمستخدمين.
              </span>
            </div>

            {!isCommitted && (
              <button
                onClick={handleConfirmImport}
                disabled={currentResult.changedRows === 0}
                className="bg-[#5A5A40] hover:bg-[#484833] disabled:opacity-50 text-[#F9F8F6] font-black text-xs px-6 py-3 rounded-xl shadow-xs transition-all shrink-0"
              >
                تأكيد واعتماد تحديث الأسعار ({currentResult.changedRows})
              </button>
            )}
          </div>

          {/* Diff Changes Table */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#2D2D24]">تفاصيل مقارنة الأسعار بالصفحة:</h4>
            <div className="overflow-x-auto border border-[#E5E2D9] rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F1EFEC] text-[#2D2D24] font-bold">
                  <tr>
                    <th className="p-3">الصف</th>
                    <th className="p-3">كود المنتج والعبوة</th>
                    <th className="p-3">اسم المنتج</th>
                    <th className="p-3">السعر القديم</th>
                    <th className="p-3">السعر الجديد (بالملف)</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2D9]">
                  {currentResult.changes.map((item, idx) => (
                    <tr
                      key={idx}
                      className={
                        item.status === 'changed'
                          ? 'bg-blue-50/50'
                          : item.status === 'error'
                          ? 'bg-red-50/50'
                          : 'hover:bg-[#F1EFEC]/80'
                      }
                    >
                      <td className="p-3 font-mono font-bold text-[#8A8A6D]">#{item.row}</td>
                      <td className="p-3 font-mono font-bold text-[#2D2D24]">
                        {item.productId} ({item.packageId})
                      </td>
                      <td className="p-3 font-bold text-[#2D2D24]">{item.productName}</td>
                      <td className="p-3 font-bold text-[#8A8A6D]">{item.oldPrice} جنيه</td>
                      <td className="p-3 font-black text-[#5A5A40] text-sm">{item.newPrice} جنيه</td>
                      <td className="p-3">
                        {item.status === 'changed' && (
                          <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            تحديث سعر ⚡
                          </span>
                        )}
                        {item.status === 'unchanged' && (
                          <span className="bg-[#E5E2D9] text-[#2D2D24] font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            مطابق بدون تغيير
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            خطأ: {item.errorReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
