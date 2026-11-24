import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Share2,
  Download,
  Trash2,
  ExternalLink,
  Check,
  Search,
  Filter,
  Layers,
  Calendar,
  FileText,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { AgronomicProgram } from '../../types';
import { dbStorage } from '../../services/dbStorage';
import { supabaseSync } from '../../services/supabaseSync';
import { exportProgramToPdf, ProgramPdfPrintable } from '../programs/ProgramPdfRenderer';

interface AdminProgramsHubProps {
  onOpenNewProgram: () => void;
}

export const AdminProgramsHub: React.FC<AdminProgramsHubProps> = ({
  onOpenNewProgram,
}) => {
  const [programs, setPrograms] = useState<AgronomicProgram[]>(() => dbStorage.getPrograms());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [printableProgram, setPrintableProgram] = useState<AgronomicProgram | null>(null);

  // Sync programs from cloud on mount
  useEffect(() => {
    supabaseSync.fetchAllPrograms().then((res) => {
      if (res.ok && res.programs.length > 0) {
        setPrograms(res.programs);
        dbStorage.savePrograms(res.programs);
      }
    });
  }, []);

  const handleCopyLink = (programId: string) => {
    const url = `${window.location.origin}/program/${programId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(programId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadPdf = async (prog: AgronomicProgram) => {
    setExportingId(prog.id);
    setPrintableProgram(prog);
    try {
      // Small timeout to allow DOM element to render
      setTimeout(async () => {
        try {
          await exportProgramToPdf(prog);
        } catch (e) {
          console.error(e);
          alert('تعذر تحميل ملف PDF');
        } finally {
          setExportingId(null);
        }
      }, 100);
    } catch {
      setExportingId(null);
    }
  };

  const handleDelete = async (prog: AgronomicProgram) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${prog.title}؟`)) return;

    dbStorage.deleteProgram(prog.id);
    await supabaseSync.deleteProgram(prog.id);
    setPrograms((prev) => prev.filter((p) => p.id !== prog.id));
  };

  // Filtered List
  const filtered = programs.filter((p) => {
    const matchesQuery =
      (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.crop || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || p.programType === selectedType;

    return matchesQuery && matchesType;
  });

  const totalProgramsValue = programs.reduce((sum, p) => sum + (p.finalTotal || 0), 0);
  const totalSavingsGiven = programs.reduce((sum, p) => sum + (p.totalSavings || 0), 0);

  return (
    <div className="space-y-6 dir-rtl font-sans">
      {/* Hidden printable DOM for PDF generation */}
      {printableProgram && <ProgramPdfPrintable program={printableProgram} />}

      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-0.5 rounded-full text-xs font-bold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>البرامج والتوصيات الزراعية الذكية</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            برامج التسميد والمكافحة وعروض الأسعار
          </h2>
          <p className="text-xs text-stone-300 font-medium">
            تصميم برامج زراعية مخصصة للمزارع الكبرى، وحساب التكاليف ونسب الخصم التسويقية ومشاركتها بروابط مباشرة.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewProgram}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-black text-xs cursor-pointer shadow-md transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء برنامج جديد</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-xs font-bold text-stone-500 block mb-1">إجمالي البرامج المنشأة</span>
          <span className="text-2xl font-black text-stone-900">{programs.length} برنامج</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-xs font-bold text-stone-500 block mb-1">إجمالي قيمة العروض</span>
          <span className="text-2xl font-black text-[#046A47]">{totalProgramsValue.toLocaleString('ar-EG')} ج</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
          <span className="text-xs font-bold text-stone-500 block mb-1">إجمالي خصومات البرامج الممنوحة</span>
          <span className="text-2xl font-black text-amber-600">{totalSavingsGiven.toLocaleString('ar-EG')} ج</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالمحصول أو العميل أو كود البرنامج..."
            className="w-full h-10 pr-9 pl-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'fertilizer', label: 'تسميد' },
            { id: 'protection', label: 'مكافحة' },
            { id: 'integrated', label: 'متكامل' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                selectedType === t.id
                  ? 'bg-[#046A47] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Programs List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200/80 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#046A47] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-stone-800">لا توجد برامج مسجلة حتى الآن</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            اضغط على زر (إنشاء برنامج جديد) لتوليد أول برنامج تسميد ومكافحة ذكي ومشاركته مع العميل.
          </p>
          <button
            type="button"
            onClick={onOpenNewProgram}
            className="inline-flex items-center gap-1.5 bg-[#046A47] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إنشاء برنامج جديد</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map((program) => (
            <div
              key={program.id}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-bold">
                    {program.id}
                  </span>
                  <h3 className="text-sm font-black text-stone-900">{program.title}</h3>
                  <span className="bg-emerald-50 text-[#046A47] text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                    {program.crop} ({program.areaAcres} فدان)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-500 font-medium flex-wrap">
                  <span>العميل: <strong className="text-stone-800">{program.clientName}</strong></span>
                  <span>•</span>
                  <span>التاريخ: {new Date(program.createdAt).toLocaleDateString('ar-EG')}</span>
                  <span>•</span>
                  <span>عدد المركبات: {program.items.length} مركب</span>
                  {program.salesRepName && (
                    <>
                      <span>•</span>
                      <span>المسؤول: <strong className="text-emerald-700">{program.salesRepName}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* Pricing & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                <div className="text-right md:text-left">
                  {program.totalSavings > 0 && (
                    <span className="text-[11px] text-stone-400 line-through block font-bold">
                      {program.originalTotal.toLocaleString('ar-EG')} ج
                    </span>
                  )}
                  <span className="text-base font-black text-[#046A47]">
                    {program.finalTotal.toLocaleString('ar-EG')} جنيه
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`/program/${program.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors cursor-pointer"
                    title="فتح رابط العميل"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(program.id)}
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors cursor-pointer"
                    title="نسخ الرابط"
                  >
                    {copiedId === program.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(program)}
                    disabled={exportingId === program.id}
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors cursor-pointer"
                    title="تحميل PDF"
                  >
                    <Download className={`w-4 h-4 ${exportingId === program.id ? 'animate-bounce text-[#046A47]' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(program)}
                    className="p-2 bg-stone-100 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
