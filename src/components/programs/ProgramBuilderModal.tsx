import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Building2,
  Trash2,
  Plus,
  Share2,
  Download,
  Check,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  FileText,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Percent,
} from 'lucide-react';
import {
  Product,
  Company,
  Package,
  TeamMember,
  ProgramType,
  SoilType,
  IrrigationType,
  DrainageType,
  ProgramItem,
  AgronomicProgram,
} from '../../types';
import {
  POPULAR_CROPS,
  GROWTH_STAGES,
  SOIL_TYPES,
  IRRIGATION_TYPES,
  DRAINAGE_TYPES,
  COMMON_TARGET_ISSUES,
  recommendAgronomicProgram,
} from '../../services/programAiService';
import { supabaseSync } from '../../services/supabaseSync';
import { dbStorage } from '../../services/dbStorage';
import { exportProgramToPdf, ProgramPdfPrintable } from './ProgramPdfRenderer';

interface ProgramBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  companies: Company[];
  packages: Package[];
  currentUser?: TeamMember | null;
  teamMembers?: TeamMember[];
  onProgramCreated?: (program: AgronomicProgram) => void;
}

export const ProgramBuilderModal: React.FC<ProgramBuilderModalProps> = ({
  isOpen,
  onClose,
  products,
  companies,
  packages,
  currentUser,
  teamMembers = [],
  onProgramCreated,
}) => {
  // Step navigation (1: Farm Profile, 2: Companies, 3: Products & Pricing, 4: Share & Export)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Farm & Client Details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [salesRepId, setSalesRepId] = useState<string>(currentUser?.id || '');
  const [salesRepName, setSalesRepName] = useState<string>(currentUser?.name || '');
  const [salesRepPhone, setSalesRepPhone] = useState<string>(currentUser?.phone || '');

  useEffect(() => {
    if (currentUser) {
      setSalesRepId(currentUser.id);
      setSalesRepName(currentUser.name);
      setSalesRepPhone(currentUser.phone || '');
    } else if (teamMembers && teamMembers.length > 0) {
      const firstRep = teamMembers.find((m) => m.role === 'sales_rep' || m.role === 'orders_manager') || teamMembers[0];
      setSalesRepId(firstRep.id);
      setSalesRepName(firstRep.name);
      setSalesRepPhone(firstRep.phone || '');
    }
  }, [currentUser, teamMembers]);
  const [crop, setCrop] = useState(POPULAR_CROPS[0]);
  const [customCrop, setCustomCrop] = useState('');
  const [areaAcres, setAreaAcres] = useState<number>(5);
  const [growthStage, setGrowthStage] = useState('vegetative');
  const [soilType, setSoilType] = useState<SoilType>('clay');
  const [irrigationType, setIrrigationType] = useState<IrrigationType>('drip');
  const [drainageType, setDrainageType] = useState<DrainageType>('good');
  const [programType, setProgramType] = useState<ProgramType>('integrated');
  const [targetIssues, setTargetIssues] = useState<string[]>([]);

  // Step 2: Selected Companies
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>(() =>
    companies.slice(0, 8).map((c) => c.id)
  );

  // Step 3: Products and Pricing Table
  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(10);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Step 4: Notes and Saving
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedProgram, setSavedProgram] = useState<AgronomicProgram | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Derived Effective Crop Name
  const effectiveCrop = crop === 'أخرى' && customCrop.trim() ? customCrop.trim() : crop;

  // Toggle company selection
  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const selectAllCompanies = () => setSelectedCompanyIds(companies.map((c) => c.id));
  const clearCompanies = () => setSelectedCompanyIds([]);

  // Toggle Target Issue
  const toggleTargetIssue = (issue: string) => {
    setTargetIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  // Run AI Recommendation
  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await recommendAgronomicProgram({
        crop: effectiveCrop,
        growthStage,
        areaAcres: Number(areaAcres) || 1,
        soilType,
        irrigationType,
        drainageType,
        programType,
        targetIssues,
        selectedCompanyIds,
        products,
        companies,
        packages,
      });

      setProgramItems(res.recommendations);
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء توليد البرنامج، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Calculations
  const originalTotal = useMemo(
    () => programItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0),
    [programItems]
  );

  const finalTotal = useMemo(
    () => programItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [programItems]
  );

  const totalSavings = Math.max(0, originalTotal - finalTotal);

  // Apply Global Discount
  const applyGlobalDiscount = (percent: number) => {
    setGlobalDiscountPercent(percent);
    const multiplier = (100 - percent) / 100;
    setProgramItems((prev) =>
      prev.map((item) => {
        const discounted = Math.round(item.originalPrice * multiplier);
        return {
          ...item,
          unitPrice: discounted,
          totalPrice: discounted * item.quantity,
          discountPercent: percent,
        };
      })
    );
  };

  // Update Item Fields
  const updateItem = (id: string, updates: Partial<ProgramItem>) => {
    setProgramItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const updated = { ...it, ...updates };
          if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
            updated.totalPrice = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return it;
      })
    );
  };

  // Remove Item
  const removeItem = (id: string) => {
    setProgramItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Add Product Manually
  const handleAddProduct = (product: Product) => {
    const pkg = packages.find((p) => p.productId === product.id);
    const comp = companies.find((c) => c.id === product.companyId);
    const originalPrice = pkg?.price || 300;
    const unitPrice = Math.round(originalPrice * ((100 - globalDiscountPercent) / 100));

    const newItem: ProgramItem = {
      id: `ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      productName: product.name,
      companyId: product.companyId,
      companyName: comp?.name || 'شركة معتمدة',
      packageId: pkg?.id,
      packageName: pkg?.displayName || 'عبوة قياسية',
      imageUrl: product.mainImageUrl,
      dose: '1 إلى 2 لتر / فدان',
      timing: 'معاملة دورية مع ماء الري',
      unitPrice,
      originalPrice,
      discountPercent: globalDiscountPercent,
      quantity: 1,
      totalPrice: unitPrice,
      reason: 'إضافة يدوية من موظف المبيعات',
    };

    setProgramItems((prev) => [...prev, newItem]);
    setIsProductPickerOpen(false);
  };

  // Save Program
  const handleSaveProgram = async () => {
    if (!effectiveCrop) {
      alert('يرجى تحديد المحصول');
      return;
    }
    if (programItems.length === 0) {
      alert('يرجى إضافة مركب واحد على الأقل للبرنامج');
      return;
    }

    setIsSaving(true);
    const programId = `PRG-${Date.now().toString().slice(-6)}`;
    const typeLabel =
      programType === 'fertilizer'
        ? 'برنامج تسميد وتغذية'
        : programType === 'protection'
        ? 'برنامج مكافحة ووقاية'
        : 'برنامج متكامل (تسميد ووقاية)';

    const newProg: AgronomicProgram = {
      id: programId,
      title: `${typeLabel} - ${effectiveCrop} (${areaAcres} فدان)`,
      programType,
      crop: effectiveCrop,
      growthStage,
      areaAcres: Number(areaAcres) || 1,
      soilType,
      irrigationType,
      drainageType,
      targetIssues,
      companyIds: selectedCompanyIds,
      items: programItems,
      originalTotal,
      finalTotal,
      totalSavings,
      globalDiscountPercent,
      marketingBadge: totalSavings > 0 ? `وفر ${totalSavings.toLocaleString('ar-EG')} ج` : undefined,
      clientName: clientName.trim() || 'عميل كروپسا',
      clientPhone: clientPhone.trim() || undefined,
      salesRepName: salesRepName.trim() || currentUser?.name || 'فريق مبيعات كروپسا',
      salesRepPhone: salesRepPhone.trim() || currentUser?.phone,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
    };

    // Save locally
    dbStorage.saveProgram(newProg);

    // Save to Supabase Cloud
    await supabaseSync.saveProgram(newProg);

    setSavedProgram(newProg);
    setCurrentStep(4);
    setIsSaving(false);
    onProgramCreated?.(newProg);
  };

  const programShareUrl = savedProgram
    ? `${window.location.origin}/program/${savedProgram.id}`
    : '';

  const copyShareLink = () => {
    if (!programShareUrl) return;
    navigator.clipboard.writeText(programShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadPdf = async () => {
    if (!savedProgram) return;
    setIsExportingPdf(true);
    try {
      await exportProgramToPdf(savedProgram);
    } catch (e) {
      console.error(e);
      alert('تعذر تحميل PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto dir-rtl font-sans">
      {/* Hidden DOM element for PDF printing */}
      {savedProgram && <ProgramPdfPrintable program={savedProgram} />}

      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#046A47] to-[#035338] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight text-white">
                مُصمم البرامج الزراعية الذكي (تسميد ومكافحة)
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium">
                توليد أفضل تركيبة مركبات مخصصة للعميل وحساب التكلفة والخصم التسويقي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps Bar */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { step: 1, label: '1. بيانات المزرعة والتربة' },
              { step: 2, label: '2. اختيار الشركات' },
              { step: 3, label: '3. ترشيح المركبات والتسعير' },
              { step: 4, label: '4. الحفظ والمشاركة' },
            ].map((s) => (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step < currentStep || (s.step === 3 && programItems.length > 0) || savedProgram) {
                    setCurrentStep(s.step as any);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                  currentStep === s.step
                    ? 'bg-[#046A47] text-white'
                    : s.step < currentStep
                    ? 'text-[#046A47] bg-emerald-50 hover:bg-emerald-100'
                    : 'text-stone-400 bg-transparent'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {currentStep === 3 && (
            <div className="text-[11px] font-black text-[#046A47] hidden sm:block">
              الإجمالي: {finalTotal.toLocaleString('ar-EG')} ج ({programItems.length} مركب)
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ================= STEP 1: FARM PROFILE ================= */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Client & Sales Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    اسم العميل أو اسم المزرعة:
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="مثال: مزرعة الحاج عبد الله - الخطاطبة"
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    رقم هاتف العميل (واتساب):
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none text-left dir-ltr"
                  />
                </div>
              </div>

              {/* Sales Rep / Engineer Assignment ("تحديد البيع") */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    تحديد مسؤول ومندوب البيع المعد لهذا البرنامج:
                  </label>
                  <select
                    value={salesRepId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSalesRepId(id);
                      const rep = teamMembers.find((m) => m.id === id);
                      if (rep) {
                        setSalesRepName(rep.name);
                        setSalesRepPhone(rep.phone || '');
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-stone-900 focus:ring-2 focus:ring-[#046A47]"
                  >
                    <option value="">كتابة يدوية / فريق مبيعات كروپسا</option>
                    {teamMembers.filter((m) => m.active).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (@{m.username}) {m.role === 'sales_rep' ? '— مندوب مبيعات' : `— ${m.role}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    رقم واتساب المندوب (المطبوع على عرض السعر):
                  </label>
                  <input
                    type="tel"
                    value={salesRepPhone}
                    onChange={(e) => setSalesRepPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full h-10 px-3 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-stone-900 focus:border-[#046A47] text-left dir-ltr font-mono"
                  />
                </div>
              </div>

              {/* Crop & Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المحصول المنزرع:</label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none cursor-pointer"
                  >
                    {POPULAR_CROPS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="أخرى">محصول آخر (كتابة يدوية)</option>
                  </select>
                </div>

                {crop === 'أخرى' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">اسم المحصول:</label>
                    <input
                      type="text"
                      value={customCrop}
                      onChange={(e) => setCustomCrop(e.target.value)}
                      placeholder="اكتب المحصول..."
                      className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المساحة (بالفدان):</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={areaAcres}
                    onChange={(e) => setAreaAcres(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">عمر النبات / المرحلة:</label>
                  <select
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none cursor-pointer"
                  >
                    {GROWTH_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Soil, Irrigation, Drainage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نوع التربة:</label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value as SoilType)}
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none cursor-pointer"
                  >
                    {SOIL_TYPES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">نظام الري:</label>
                  <select
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value as IrrigationType)}
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none cursor-pointer"
                  >
                    {IRRIGATION_TYPES.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">كفاءة الصرف:</label>
                  <select
                    value={drainageType}
                    onChange={(e) => setDrainageType(e.target.value as DrainageType)}
                    className="w-full h-10 px-3 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:border-[#046A47] focus:outline-none cursor-pointer"
                  >
                    {DRAINAGE_TYPES.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Program Goal Type */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">نوع البرنامج المطلوب:</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'integrated', title: 'برنامج متكامل (تسميد + وقاية)', desc: 'أعلى شمولية وحماية' },
                    { id: 'fertilizer', title: 'برنامج تسميد وتغذية فقط', desc: 'NPK + مخصبات وعناصر' },
                    { id: 'protection', title: 'برنامج مكافحة ووقاية فقط', desc: 'مبيدات فطرية وحشرية' },
                  ].map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setProgramType(pt.id as ProgramType)}
                      className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                        programType === pt.id
                          ? 'border-[#046A47] bg-emerald-50/70 ring-2 ring-[#046A47]'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <span className="font-black text-xs block text-stone-900">{pt.title}</span>
                      <span className="text-[10px] text-stone-500 font-medium">{pt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Issues / Focus Areas */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  مشاكل أو أهداف خاصة ترغب في تركيز الذكاء الاصطناعي عليها:
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TARGET_ISSUES.map((issue) => {
                    const isSelected = targetIssues.includes(issue);
                    return (
                      <button
                        key={issue}
                        type="button"
                        onClick={() => toggleTargetIssue(issue)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#046A47] text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {issue} {isSelected ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Nav Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 bg-[#046A47] hover:bg-[#035338] text-white px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-colors"
                >
                  <span>التالي: اختيار الشركات</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: COMPANY SELECTION ================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900">
                    الشركات المعتمدة التي ترغب بتوريد البرنامج منها
                  </h3>
                  <p className="text-xs text-stone-500">
                    يقوم الذكاء الاصطناعي باختيار أفضل وأنسب المركبات حصرياً من الشركات المحددة أدناه:
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllCompanies}
                    className="text-[#046A47] font-bold hover:underline cursor-pointer"
                  >
                    اختيار الكل ({companies.length})
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={clearCompanies}
                    className="text-stone-400 font-bold hover:underline cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                {companies.map((company) => {
                  const isSelected = selectedCompanyIds.includes(company.id);
                  const companyProductsCount = products.filter((p) => p.companyId === company.id).length;

                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => toggleCompany(company.id)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-[#046A47] bg-emerald-50/70 ring-2 ring-[#046A47]'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0 overflow-hidden border border-stone-200">
                        {company.logoUrl ? (
                          <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-stone-900 block truncate">
                          {company.name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-semibold">
                          {companyProductsCount} مركب متاح
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Nav Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={isGeneratingAi || selectedCompanyIds.length === 0}
                  className="flex items-center gap-2 bg-gradient-to-r from-[#046A47] to-emerald-600 hover:from-[#035338] hover:to-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 text-amber-300 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAi ? 'جاري التحليل والترشيح بالذكاء الاصطناعي...' : 'توليد البرنامج بالذكاء الاصطناعي ✨'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PRODUCTS & MARKETING PRICING ================= */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Marketing Discount Header Tool */}
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-xs font-black text-stone-900 flex items-center justify-center sm:justify-start gap-1.5">
                    <TrendingDown className="w-4 h-4 text-emerald-700" />
                    <span>الخدعة التسويقية وضبط الخصم على إجمالي البرنامج:</span>
                  </span>
                  <p className="text-[11px] text-stone-600">
                    يمكنك كتابة نسبة خصم تظهر للعميل أو تعديل سعر كل مركب يدوياً ليظهر السعر التجاري مشطوباً.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-stone-700">نسبة الخصم:</span>
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyGlobalDiscount(pct)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                        globalDiscountPercent === pct
                          ? 'bg-[#046A47] text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <div className="flex items-center bg-white border border-stone-300 rounded-xl px-2 py-1 w-20">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={globalDiscountPercent}
                      onChange={(e) => applyGlobalDiscount(Number(e.target.value))}
                      className="w-full text-xs font-black text-center focus:outline-none"
                    />
                    <Percent className="w-3 h-3 text-stone-400" />
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-stone-800">
                    جدول المركبات المقترحة ({programItems.length} مركب)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsProductPickerOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#046A47] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة منتج آخر للبرنامج</span>
                  </button>
                </div>

                {programItems.length === 0 ? (
                  <div className="text-center py-10 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500">
                    لا توجد مركبات بالبرنامج حتى الآن. اضغط على زر توليد البرنامج أو أضف منتجات يدوياً.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-stone-100 text-stone-700 text-[11px] font-black border-b border-stone-200">
                        <tr>
                          <th className="p-3">المركب والشركة</th>
                          <th className="p-3">الجرعة والتوقيت</th>
                          <th className="p-3 text-center">الكمية</th>
                          <th className="p-3 text-center">السعر التجاري</th>
                          <th className="p-3 text-center">سعر العرض</th>
                          <th className="p-3 text-left">الإجمالي</th>
                          <th className="p-3 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {programItems.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50/50">
                            <td className="p-3">
                              <span className="font-bold text-stone-900 block">{item.productName}</span>
                              <span className="text-[10px] text-stone-400 font-semibold">
                                {item.companyName} {item.packageName ? `• ${item.packageName}` : ''}
                              </span>
                            </td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.dose}
                                onChange={(e) => updateItem(item.id, { dose: e.target.value })}
                                placeholder="الجرعة"
                                className="w-full p-1 bg-white border border-stone-200 rounded text-[11px] font-bold text-[#046A47] mb-1"
                              />
                              <input
                                type="text"
                                value={item.timing}
                                onChange={(e) => updateItem(item.id, { timing: e.target.value })}
                                placeholder="التوقيت"
                                className="w-full p-1 bg-white border border-stone-200 rounded text-[10px] text-stone-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, { quantity: Math.max(1, Number(e.target.value)) })}
                                className="w-16 p-1 bg-white border border-stone-200 rounded text-center text-xs font-black text-stone-900"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={item.originalPrice}
                                onChange={(e) => updateItem(item.id, { originalPrice: Number(e.target.value) })}
                                className="w-20 p-1 bg-white border border-stone-200 rounded text-center text-xs font-bold text-stone-400 line-through"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                                className="w-20 p-1 bg-white border border-stone-200 rounded text-center text-xs font-black text-[#046A47]"
                              />
                            </td>
                            <td className="p-3 text-left font-black text-stone-900">
                              {item.totalPrice.toLocaleString('ar-EG')} ج
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total Financial Summary Bar */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[10px]">القيمة التجارية المرجعية:</span>
                    <span className="font-bold line-through text-stone-500">
                      {originalTotal.toLocaleString('ar-EG')} جنيه
                    </span>
                  </div>
                  {totalSavings > 0 && (
                    <div>
                      <span className="text-emerald-700 block text-[10px]">إجمالي التوفير للعميل:</span>
                      <span className="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        وفر {totalSavings.toLocaleString('ar-EG')} ج
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <span className="text-[10px] text-stone-400 block font-semibold">صافي قيمة البرنامج:</span>
                  <span className="text-2xl font-black text-[#046A47]">
                    {finalTotal.toLocaleString('ar-EG')} جنيه
                  </span>
                </div>
              </div>

              {/* Engineer Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  توصيات وملاحظات المهندس للعميل:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يرجى الرش في الصباح الباكر وتكرار المعاملة بعد 10 أيام..."
                  className="w-full p-3 bg-white border border-stone-300 rounded-xl text-xs font-medium focus:border-[#046A47] focus:outline-none"
                />
              </div>

              {/* Bottom Nav Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق (الشركات)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveProgram}
                  disabled={isSaving || programItems.length === 0}
                  className="flex items-center gap-2 bg-[#046A47] hover:bg-[#035338] text-white px-7 py-3 rounded-2xl font-black text-xs cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'جاري الحفظ والتوليد...' : 'حفظ البرنامج وتوليد الرابط والـ PDF ✓'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: SAVE & SHARE ================= */}
          {currentStep === 4 && savedProgram && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#046A47] flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-stone-900">
                  تم حفظ واعتماد البرنامج الزراعي بنجاح!
                </h3>
                <p className="text-xs text-stone-500">
                  كود البرنامج: <span className="font-mono font-bold text-stone-800">{savedProgram.id}</span>
                </p>
              </div>

              {/* Share URL Box */}
              <div className="max-w-xl mx-auto bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-stone-700 block text-right">
                  رابط البرنامج للمشاركة مع العميل:
                </span>
                <div className="flex items-center gap-2 bg-white border border-stone-300 rounded-xl p-1.5">
                  <input
                    type="text"
                    readOnly
                    value={programShareUrl}
                    className="w-full text-xs font-mono font-bold text-stone-600 px-2 outline-none text-left dir-ltr truncate"
                  />
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="bg-[#046A47] hover:bg-[#035338] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer shrink-0 transition-colors"
                  >
                    {copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `برنامج ${savedProgram.crop} الزراعي المعتمد لك من كروپسا:\n${programShareUrl}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-3 rounded-2xl font-bold text-xs cursor-pointer shadow-sm transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة عبر واتساب</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 bg-[#046A47] hover:bg-[#035338] text-white px-6 py-3 rounded-2xl font-bold text-xs cursor-pointer shadow-sm transition-all"
                >
                  <Download className={`w-4 h-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
                  <span>{isExportingPdf ? 'جاري التحميل...' : 'تحميل البرنامج PDF'}</span>
                </button>

                <a
                  href={`/program/${savedProgram.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 px-5 py-3 rounded-2xl font-bold text-xs cursor-pointer transition-colors"
                >
                  <span>معاينة صفحة العميل</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Product Picker Sub-modal */}
        {isProductPickerOpen && (
          <div className="fixed inset-0 z-60 bg-stone-950/60 flex items-center justify-center p-4 dir-rtl">
            <div className="bg-white w-full max-w-xl rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h4 className="text-sm font-black text-stone-900">إضافة مركب من الشركات المختارة</h4>
                <button
                  type="button"
                  onClick={() => setIsProductPickerOpen(false)}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="ابحث باسم المركب أو المادة الفعالة..."
                className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#046A47]"
              />

              <div className="overflow-y-auto space-y-2 flex-1 max-h-72">
                {products
                  .filter(
                    (p) =>
                      selectedCompanyIds.includes(p.companyId) &&
                      p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
                  )
                  .slice(0, 30)
                  .map((product) => {
                    const comp = companies.find((c) => c.id === product.companyId);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        className="w-full p-2.5 rounded-xl border border-stone-100 hover:border-emerald-300 hover:bg-emerald-50/50 flex items-center justify-between text-right cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="font-bold text-xs text-stone-900 block">{product.name}</span>
                          <span className="text-[10px] text-stone-400">{comp?.name || ''}</span>
                        </div>
                        <span className="text-xs font-black text-[#046A47] bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          + إضافة
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
