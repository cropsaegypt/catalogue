import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AgronomicProgram } from '../../types';

interface ProgramPdfRendererProps {
  program: AgronomicProgram;
  onClose?: () => void;
}

export async function exportProgramToPdf(program: AgronomicProgram, elementId: string = 'program-pdf-printable'): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error('تعذر العثور على عنصر الطباعة');
  }

  // Temporary show container if hidden
  const originalDisplay = el.style.display;
  el.style.display = 'block';

  try {
    const canvas = await html2canvas(el, {
      scale: 2, // High resolution for sharp print
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const safeCrop = (program.crop || 'محصول').replace(/\s+/g, '_');
    pdf.save(`برنامج_كروپسا_${safeCrop}_${program.id}.pdf`);
  } finally {
    el.style.display = originalDisplay;
  }
}

export const ProgramPdfPrintable: React.FC<{ program: AgronomicProgram }> = ({ program }) => {
  const typeArabic =
    program.programType === 'fertilizer'
      ? 'برنامج تسميد وتغذية معتمد'
      : program.programType === 'protection'
      ? 'برنامج مكافحة ووقاية نباتية'
      : 'برنامج متكامل (تسميد ووقاية)';

  const soilLabels: Record<string, string> = {
    clay: 'تربة طينية',
    sandy: 'تربة رملية',
    calcareous: 'تربة كلسية جيرية',
    silt: 'تربة طميية',
    other: 'تربة متنوعة',
  };

  const irrigationLabels: Record<string, string> = {
    drip: 'تنقيط (شبكة)',
    flood: 'غمر',
    pivot: 'محوري (بيڤوت)',
    sprinkler: 'رشاشات',
    other: 'أخرى',
  };

  return (
    <div
      id="program-pdf-printable"
      className="hidden w-[820px] bg-white text-stone-900 p-8 font-sans dir-rtl select-none"
      style={{ minHeight: '1120px' }}
    >
      {/* 1. Header Banner */}
      <div className="border-b-2 border-[#046A47] pb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#046A47] text-white text-xs font-black px-2.5 py-1 rounded-md">
              CROPSA 🌾
            </span>
            <span className="text-xs font-bold text-stone-500">
              سوق ومستلزمات الإنتاج الزراعي
            </span>
          </div>
          <h1 className="text-xl font-black text-stone-900 mt-2">
            {program.title || `${typeArabic} - ${program.crop}`}
          </h1>
          <p className="text-xs text-stone-500 font-semibold mt-0.5">
            كود البرنامج المعتمد: <span className="font-mono text-stone-700">{program.id}</span> | التاريخ:{' '}
            {new Date(program.createdAt).toLocaleDateString('ar-EG')}
          </p>
        </div>

        <div className="text-left dir-ltr">
          <div className="text-xl font-black tracking-wider text-[#046A47]">CROPSA</div>
          <div className="text-[10px] text-stone-400 font-bold">Agricultural Solutions</div>
          <div className="text-[11px] font-bold text-stone-600 mt-1">
            مبيعات واستشارات: 01010100069
          </div>
        </div>
      </div>

      {/* 2. Farm & Client Profile Badges */}
      <div className="grid grid-cols-4 gap-3 my-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">العميل / المزرعة:</span>
          <span className="font-black text-stone-800">{program.clientName || 'عميل كروپسا'}</span>
        </div>
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">المحصول المستهدف:</span>
          <span className="font-black text-[#046A47]">{program.crop}</span>
        </div>
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">المساحة:</span>
          <span className="font-black text-stone-800">{program.areaAcres} فدان</span>
        </div>
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">التربة والري:</span>
          <span className="font-black text-stone-800">
            {soilLabels[program.soilType] || program.soilType} - {irrigationLabels[program.irrigationType] || program.irrigationType}
          </span>
        </div>
      </div>

      {/* 3. Marketing Savings Banner */}
      {program.totalSavings > 0 && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
              ✓
            </span>
            <div>
              <span className="font-black text-emerald-950 block text-xs">
                عرض تجاري خاص ومعتمد للمزرعة
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                خصم حصري على إجمالي البرنامج بقيمة{' '}
                <strong className="font-black text-emerald-900">{program.totalSavings.toLocaleString('ar-EG')} جنيه</strong>
              </span>
            </div>
          </div>
          <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-lg">
            وفر {program.totalSavings.toLocaleString('ar-EG')} ج
          </span>
        </div>
      )}

      {/* 4. Products Recommendation Table */}
      <div className="my-3 overflow-hidden border border-stone-200 rounded-xl">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-700 font-black border-b border-stone-200 text-[11px]">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">المركب والشركة</th>
              <th className="py-2.5 px-3">الجرعة وموعد الإضافة</th>
              <th className="py-2.5 px-3 text-center">الكمية</th>
              <th className="py-2.5 px-3 text-center">السعر التجاري</th>
              <th className="py-2.5 px-3 text-center">سعر البرنامج</th>
              <th className="py-2.5 px-3 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-[11px]">
            {program.items.map((item, idx) => {
              const hasDiscount = item.originalPrice > item.unitPrice;
              return (
                <tr key={item.id} className="hover:bg-stone-50/60">
                  <td className="py-2.5 px-3 font-bold text-stone-400">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-black text-stone-900 block">{item.productName}</span>
                    <span className="text-[10px] text-stone-500 font-semibold">
                      {item.companyName} {item.packageName ? `• ${item.packageName}` : ''}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-[#046A47] block">{item.dose}</span>
                    <span className="text-[10px] text-stone-500">{item.timing}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-stone-800">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-center text-stone-400">
                    {hasDiscount ? (
                      <span className="line-through">{item.originalPrice.toLocaleString('ar-EG')} ج</span>
                    ) : (
                      <span>{item.originalPrice.toLocaleString('ar-EG')} ج</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-black text-[#046A47]">
                    {item.unitPrice.toLocaleString('ar-EG')} ج
                  </td>
                  <td className="py-2.5 px-3 text-left font-black text-stone-900">
                    {item.totalPrice.toLocaleString('ar-EG')} ج
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Summary & Financial Totals Box */}
      <div className="flex justify-between items-start gap-4 my-4">
        {/* Agronomic Recommendations Note */}
        <div className="flex-1 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-950 space-y-1">
          <span className="font-black block text-xs text-amber-900 mb-1">
            توصيات الاستخدام الفنية:
          </span>
          <p className="leading-relaxed text-stone-700">
            • تم ضبط الجرعات المقترحة لتناسب مساحة {program.areaAcres} فدان وطبيعة التربة المسجلة.
          </p>
          <p className="leading-relaxed text-stone-700">
            • يرجى الالتزام بمواعيد الرش والحقن وتجنب الرش وقت الظهيرة وارتفاع درجات الحرارة.
          </p>
          {program.notes && (
            <p className="leading-relaxed font-bold text-[#046A47] pt-1">
              ملاحظة المهندس: {program.notes}
            </p>
          )}
        </div>

        {/* Totals Table */}
        <div className="w-64 bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-1.5 shrink-0">
          <div className="flex justify-between text-stone-500">
            <span>القيمة التجارية المرجعية:</span>
            <span className="font-bold line-through">
              {program.originalTotal.toLocaleString('ar-EG')} ج
            </span>
          </div>

          {program.totalSavings > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>خصم البرنامج والتوفير:</span>
              <span>- {program.totalSavings.toLocaleString('ar-EG')} ج</span>
            </div>
          )}

          <div className="border-t border-stone-200 pt-1.5 flex justify-between items-baseline font-black text-stone-950 text-sm">
            <span>إجمالي العرض المطلوب:</span>
            <span className="text-base text-[#046A47]">
              {program.finalTotal.toLocaleString('ar-EG')} جنيه
            </span>
          </div>
        </div>
      </div>

      {/* 6. Footer & Contact */}
      <div className="mt-8 pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400">
        <div>
          <span>منصة كروپسا الرقمية للمخصبات والأسمدة | </span>
          <span className="font-bold text-stone-600">cropsa-catalogue.cropsa.org</span>
        </div>
        <div className="text-left">
          <span>المهندس المسؤول: {program.salesRepName || 'فريق الدعم الفني كروپسا'}</span>
        </div>
      </div>
    </div>
  );
};
