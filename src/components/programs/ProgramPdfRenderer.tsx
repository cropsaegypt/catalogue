import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AgronomicProgram } from '../../types';
import { getProgramAgronomicGuide } from '../../services/agronomicGuideService';

interface ProgramPdfRendererProps {
  program: AgronomicProgram;
  onClose?: () => void;
}

/**
 * Bulletproof PDF exporter using html2canvas & jsPDF.
 * NEVER sets allowTaint: true (which causes SecurityError on toDataURL).
 * Offscreen element is rendered in normal layout so dimensions and styles are accurate.
 */
export async function exportProgramToPdf(
  program: AgronomicProgram,
  elementId: string = 'program-pdf-printable'
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error('تعذر العثور على عنصر الطباعة في الصفحة');
  }

  // Ensure images have time to settle
  await new Promise((resolve) => setTimeout(resolve, 150));

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(el, {
      scale: 2, // High resolution for crisp, professional print
      useCORS: true,
      allowTaint: false, // Critical: allowTaint MUST be false to allow canvas.toDataURL export!
      backgroundColor: '#FFFFFF',
      logging: false,
      imageTimeout: 12000,
      windowWidth: 850,
    });
  } catch (canvasErr) {
    console.warn('html2canvas scale 2 failed, falling back to scale 1.5...', canvasErr);
    // Fallback with lower scale if device memory is constrained
    canvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#FFFFFF',
      logging: false,
      imageTimeout: 12000,
      windowWidth: 850,
    });
  }

  let imgData: string;
  try {
    imgData = canvas.toDataURL('image/jpeg', 0.95);
  } catch (taintErr) {
    console.error('Canvas toDataURL failed:', taintErr);
    throw new Error('حدث خطأ أثناء تصدير الصورة، يرجى إعادة المحاولة.');
  }

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

  // Page 1
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Subsequent pages for multi-page agronomic guide and products
  while (heightLeft > 2) {
    position -= pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  const safeCrop = (program.crop || 'محصول').replace(/\s+/g, '_');
  pdf.save(`برنامج_كروپسا_${safeCrop}_${program.id}.pdf`);
}

/**
 * Off-screen printable component formatted specifically for A4 documents.
 * Kept in layout tree (left: -99999px) so styles and geometry compute accurately.
 */
export const ProgramPdfPrintable: React.FC<{ program: AgronomicProgram }> = ({ program }) => {
  const guide = getProgramAgronomicGuide(
    program.crop,
    program.soilType,
    program.irrigationType,
    program.programType,
    program.areaAcres
  );

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
      style={{
        position: 'fixed',
        left: '-99999px',
        top: 0,
        width: '820px',
        zIndex: -9999,
        pointerEvents: 'none',
        backgroundColor: '#FFFFFF',
      }}
      className="bg-white text-stone-900 p-8 font-sans dir-rtl select-none"
    >
      {/* ================= 1. Header Banner ================= */}
      <div className="border-b-2 border-[#046A47] pb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#046A47] text-white text-xs font-black px-2.5 py-1 rounded-md">
              CROPSA 🌾
            </span>
            <span className="text-xs font-bold text-stone-500">
              سوق ومستلزمات الإنتاج الزراعي • برامج معتمدة
            </span>
          </div>
          <h1 className="text-xl font-black text-stone-900 mt-2">
            {program.title || `${typeArabic} - ${program.crop}`}
          </h1>
          <p className="text-xs text-stone-500 font-semibold mt-0.5">
            كود البرنامج المعتمد: <span className="font-mono text-stone-800 font-black">{program.id}</span> | التاريخ:{' '}
            {new Date(program.createdAt).toLocaleDateString('ar-EG')}
          </p>
        </div>

        <div className="text-left dir-ltr">
          <div className="text-2xl font-black tracking-wider text-[#046A47]">CROPSA</div>
          <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Agricultural Solutions</div>
          <div className="text-[11px] font-bold text-stone-600 mt-1">
            مبيعات واستشارات: 01010100069
          </div>
        </div>
      </div>

      {/* ================= 2. Farm & Client Profile Badges ================= */}
      <div className="grid grid-cols-4 gap-3 my-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">العميل / المزرعة:</span>
          <span className="font-black text-stone-900 text-sm">{program.clientName || 'عميل كروپسا'}</span>
        </div>
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">المحصول المستهدف:</span>
          <span className="font-black text-[#046A47] text-sm">{program.crop}</span>
        </div>
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">المساحة:</span>
          <span className="font-black text-stone-900 text-sm">{program.areaAcres} فدان</span>
        </div>
        <div>
          <span className="text-stone-400 font-semibold block text-[10px]">التربة والري:</span>
          <span className="font-black text-stone-900">
            {soilLabels[program.soilType] || program.soilType} - {irrigationLabels[program.irrigationType] || program.irrigationType}
          </span>
        </div>
      </div>

      {/* ================= 3. Marketing Savings Banner ================= */}
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
                <strong className="font-black text-emerald-950">{program.totalSavings.toLocaleString('ar-EG')} جنيه</strong>
                {program.globalDiscountPercent ? ` (${program.globalDiscountPercent}% خصم)` : ''}
              </span>
            </div>
          </div>
          <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-lg">
            وفرت {program.totalSavings.toLocaleString('ar-EG')} ج
          </span>
        </div>
      )}

      {/* ================= 4. Products Recommendation Table ================= */}
      <div className="my-3 overflow-hidden border border-stone-200 rounded-xl">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100 text-stone-800 font-black border-b border-stone-200 text-[11px]">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">المركب والشركة</th>
              <th className="py-2.5 px-3">الجرعة وموعد الإضافة</th>
              <th className="py-2.5 px-3 text-center">الكمية</th>
              <th className="py-2.5 px-3 text-center">السعر التجاري</th>
              <th className="py-2.5 px-3 text-center">سعر العرض</th>
              <th className="py-2.5 px-3 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-[11px]">
            {program.items.map((item, idx) => {
              const hasDiscount = item.originalPrice > item.unitPrice;
              return (
                <tr key={item.id} className="hover:bg-stone-50/60">
                  <td className="py-2 px-3 font-bold text-stone-400">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <span className="font-black text-stone-900 block">{item.productName}</span>
                    <span className="text-[10px] text-stone-500 font-semibold">
                      {item.companyName} {item.packageName ? `• ${item.packageName}` : ''}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-bold text-[#046A47] block">{item.dose}</span>
                    <span className="text-[10px] text-stone-500">{item.timing}</span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-stone-800">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-3 text-center text-stone-400">
                    {hasDiscount ? (
                      <span className="line-through">{item.originalPrice.toLocaleString('ar-EG')} ج</span>
                    ) : (
                      <span>{item.originalPrice.toLocaleString('ar-EG')} ج</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-black text-[#046A47]">
                    {item.unitPrice.toLocaleString('ar-EG')} ج
                  </td>
                  <td className="py-2 px-3 text-left font-black text-stone-900">
                    {item.totalPrice.toLocaleString('ar-EG')} ج
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= 5. Financial Totals & Engineer Quick Notes ================= */}
      <div className="flex justify-between items-start gap-4 my-4">
        {/* Agronomic Recommendations Note */}
        <div className="flex-1 bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 text-[11px] text-amber-950 space-y-1">
          <span className="font-black block text-xs text-amber-900 mb-1">
            توصيات الاستخدام الفنية السريعة:
          </span>
          <p className="leading-relaxed text-stone-700">
            • تم ضبط الجرعات المقترحة لتناسب مساحة {program.areaAcres} فدان وطبيعة التربة المسجلة ({soilLabels[program.soilType] || program.soilType}).
          </p>
          <p className="leading-relaxed text-stone-700">
            • يرجى الالتزام بمواعيد الرش والحقن وتجنب الرش وقت الظهيرة وارتفاع درجات الحرارة.
          </p>
          {program.notes && (
            <p className="leading-relaxed font-bold text-[#046A47] pt-1 border-t border-amber-200/70 mt-1">
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

      {/* ================= 6. ILLUSTRATED AGRONOMIC GUIDE SECTION ================= */}
      {/* "شرح البرنامج بصور وكدا حاجة رايقة" */}
      <div className="mt-8 pt-6 border-t-2 border-stone-200 space-y-4">
        <div className="bg-gradient-to-r from-[#046A47] to-[#035338] text-white p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌾</span>
            <div>
              <h2 className="text-sm font-black text-white">
                دليل وشرح بروتوكول الخدمة الحقلي لمحصول ({program.crop})
              </h2>
              <p className="text-[10px] text-emerald-100">
                مراحل النمو والتطبيق الهندسي المعتمد لضمان أعلى إنتاجية وأعلى جودة تسويقية
              </p>
            </div>
          </div>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
            بروتوكول معتمد
          </span>
        </div>

        {/* 5 Growth Stage Cards Grid */}
        <div className="grid grid-cols-1 gap-2.5 text-xs">
          {guide.stages.map((stage, sIdx) => (
            <div
              key={stage.id}
              className="border border-stone-200 rounded-xl p-3 bg-stone-50/70 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#046A47] text-white flex items-center justify-center text-xs font-black">
                    {stage.icon}
                  </span>
                  <div>
                    <h3 className="font-black text-stone-900 text-xs">
                      المرحلة {sIdx + 1}: {stage.stageName}
                    </h3>
                    <span className="text-[10px] text-stone-500 font-medium">
                      {stage.stageSubtitle}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-white font-bold text-[#046A47] border border-stone-200 px-2 py-0.5 rounded">
                  تطبيق ميداني
                </span>
              </div>

              {/* Goals & Practices */}
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div className="bg-white p-2 rounded-lg border border-stone-200/60">
                  <span className="font-bold text-stone-800 block mb-0.5">الأهداف الفسيولوجية:</span>
                  <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                    {stage.goals.map((g, gi) => (
                      <li key={gi}>{g}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-2 rounded-lg border border-stone-200/60">
                  <span className="font-bold text-[#046A47] block mb-0.5">المعاملة والتسميد المقترح:</span>
                  <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                    {stage.recommendedPractices.map((p, pi) => (
                      <li key={pi}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Engineer Tip */}
              <div className="text-[10px] bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-200 font-semibold">
                💡 <strong>نصيحة المهندس:</strong> {stage.engineerTip}
              </div>
            </div>
          ))}
        </div>

        {/* Soil & Irrigation Guidelines Box */}
        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
          <div className="border border-stone-200 bg-stone-50 p-3 rounded-xl space-y-1">
            <span className="font-black text-[#046A47] block text-xs">
              📍 {guide.soilAdvice.title}
            </span>
            <p className="text-[10px] text-stone-600 leading-relaxed">
              {guide.soilAdvice.description}
            </p>
            <ul className="list-disc list-inside text-[10px] text-stone-700 space-y-0.5 pt-1">
              {guide.soilAdvice.keyPoints.map((kp, kpi) => (
                <li key={kpi}>{kp}</li>
              ))}
            </ul>
          </div>

          <div className="border border-stone-200 bg-stone-50 p-3 rounded-xl space-y-1">
            <span className="font-black text-[#046A47] block text-xs">
              💧 {guide.irrigationAdvice.title}
            </span>
            <p className="text-[10px] text-stone-600 leading-relaxed">
              {guide.irrigationAdvice.description}
            </p>
            <ul className="list-disc list-inside text-[10px] text-stone-700 space-y-0.5 pt-1">
              {guide.irrigationAdvice.keyPoints.map((kp, kpi) => (
                <li key={kpi}>{kp}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* General Spraying & Safety Protocol */}
        <div className="bg-stone-100 p-3 rounded-xl border border-stone-200 text-[10px] text-stone-700 space-y-1">
          <span className="font-bold text-stone-900 block text-xs">
            🛡️ قواعد الرش والتطبيق الآمن لضمان أعلى فاعلية:
          </span>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              {guide.sprayingBestPractices.slice(0, 2).map((bp, bpi) => (
                <p key={bpi}>• {bp}</p>
              ))}
            </div>
            <div>
              {guide.sprayingBestPractices.slice(2).map((bp, bpi) => (
                <p key={bpi}>• {bp}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 7. Footer & Signature ================= */}
      <div className="mt-8 pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-500">
        <div>
          <span>منصة كروپسا الرقمية للمخصبات والأسمدة | </span>
          <span className="font-bold text-stone-700">cropsa-catalogue.cropsa.org</span>
        </div>
        <div className="text-left font-bold text-stone-800">
          <span>المهندس الزراعي المعتمد: {program.salesRepName || 'فريق الدعم الفني كروپسا'}</span>
        </div>
      </div>
    </div>
  );
};
