import React, { useState } from 'react';
import {
  Banknote,
  Search,
  Eye,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Save,
  FileText,
  HelpCircle,
  MessageCircle,
  X,
  ZoomIn,
  CheckCircle2,
} from 'lucide-react';
import {
  CatalogSettings,
  IslamicFinancingConfig,
  IslamicFinancingRequest,
} from '../../types';
import { resolveIslamicFinancingConfig } from '../../utils/islamicFinancingDefaults';

interface IslamicFinancingManagerProps {
  requests: IslamicFinancingRequest[];
  settings: CatalogSettings;
  onSaveRequests: (requests: IslamicFinancingRequest[]) => void;
  onSaveSettings: (settings: CatalogSettings) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

const STATUS_META: Record<
  IslamicFinancingRequest['status'],
  { label: string; badgeClass: string }
> = {
  new: { label: 'طلب جديد', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  reviewing: { label: 'قيد المراجعة', badgeClass: 'bg-sky-100 text-sky-900 border-sky-300' },
  approved: { label: 'تمت الموافقة', badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  completed: { label: 'مكتمل ومسلّم', badgeClass: 'bg-stone-200 text-stone-800 border-stone-300' },
  rejected: { label: 'مرفوض', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
};

const PLAN_LABELS: Record<string, string> = {
  after_harvest: 'بعد الحصاد (موسمي)',
  monthly_3: 'دفعات 3 شهور',
  monthly_6: 'دفعات 6 شهور',
  monthly_12: 'دفعات 12 شهراً',
};

const APPLICANT_TYPE_LABELS: Record<string, string> = {
  farmer: 'مزارع / صاحب مزرعة',
  merchant: 'تاجر / صاحب محل',
  company: 'مشروع / جمعية',
};

export const IslamicFinancingManager: React.FC<IslamicFinancingManagerProps> = ({
  requests,
  settings,
  onSaveRequests,
  onSaveSettings,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'requests' | 'config'>('requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<IslamicFinancingRequest | null>(null);
  const [zoomedDocUrl, setZoomedDocUrl] = useState<string | null>(null);

  // Config editor state initialized from settings
  const [config, setConfig] = useState<IslamicFinancingConfig>(() =>
    resolveIslamicFinancingConfig(settings)
  );

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      req.requestNumber.toLowerCase().includes(q) ||
      req.applicantName.toLowerCase().includes(q) ||
      req.phone.includes(q) ||
      (req.governorate || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleUpdateRequest = (
    requestId: string,
    patch: Partial<IslamicFinancingRequest>,
    toastMsg?: string
  ) => {
    const now = new Date().toISOString();
    const updated = requests.map((r) => (r.id === requestId ? { ...r, ...patch, updatedAt: now } : r));
    onSaveRequests(updated);
    if (selectedRequest?.id === requestId) {
      setSelectedRequest((prev) => (prev ? { ...prev, ...patch, updatedAt: now } : null));
    }
    if (toastMsg) onShowToast(toastMsg, 'success');
  };

  const handleSaveConfig = () => {
    onSaveSettings({
      ...settings,
      islamicFinancingConfig: config,
    });
    onShowToast('تم حفظ أسئلة ومستندات التمويل الإسلامي ومزامنتها للصفحة ✓', 'success');
  };

  const counts = {
    total: requests.length,
    new: requests.filter((r) => r.status === 'new').length,
    reviewing: requests.filter((r) => r.status === 'reviewing').length,
    approved: requests.filter((r) => r.status === 'approved').length,
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header + Sub-tab Switcher */}
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-[#046A47]" />
            <span>إدارة التمويل الإسلامي (الطلبات والأسئلة والمستندات)</span>
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-1">
            مراجعة طلبات التمويل الإسلامي وصور المستندات المرفوعة، وتخصيص الأسئلة والأوراق المطلوبة للعملاء
          </p>
        </div>

        <div className="inline-flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
          <button
            type="button"
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'requests' ? 'bg-[#046A47] text-white shadow-xs' : 'text-stone-600'
            }`}
          >
            الطلبات الواردة ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('config')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              subTab === 'config' ? 'bg-[#046A47] text-white shadow-xs' : 'text-stone-600'
            }`}
          >
            إعداد الأسئلة والأوراق المطلوبة
          </button>
        </div>
      </div>

      {/* TAB 1: APPLICATIONS & UPLOADED DOCUMENTS */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 block">إجمالي الطلبات</span>
              <span className="text-2xl font-black text-stone-900">{counts.total}</span>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800 block">طلبات جديدة</span>
              <span className="text-2xl font-black text-amber-950">{counts.new}</span>
            </div>
            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200">
              <span className="text-[11px] font-bold text-sky-800 block">قيد المراجعة</span>
              <span className="text-2xl font-black text-sky-950">{counts.reviewing}</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
              <span className="text-[11px] font-bold text-[#046A47] block">تمت الموافقة</span>
              <span className="text-2xl font-black text-[#046A47]">{counts.approved}</span>
            </div>
          </div>

          {/* Search & Status Filter */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب أو اسم العميل أو الهاتف أو المحافظة..."
                className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'new', label: 'جديد' },
                { id: 'reviewing', label: 'قيد المراجعة' },
                { id: 'approved', label: 'موافق عليه' },
                { id: 'completed', label: 'مكتمل' },
                { id: 'rejected', label: 'مرفوض' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-[#046A47] text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-2">
              <Banknote className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-black text-stone-600">
                لا توجد طلبات تمويل إسلامي مسجلة حالياً
              </p>
              <p className="text-xs text-stone-400">
                أي طلب يرسله العميل من صفحة «تمويل إسلامي» سيظهر هنا مع كافة أوراقه وإجاباته
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const stMeta = STATUS_META[req.status] || STATUS_META.new;
                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-wrap items-center justify-between gap-4 hover:border-[#046A47] transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#046A47] bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                          {req.requestNumber}
                        </span>
                        <h3 className="text-sm font-black text-stone-900">{req.applicantName}</h3>
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${stMeta.badgeClass}`}
                        >
                          {stMeta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 font-semibold">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          {req.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                          {req.governorate} {req.city ? `- ${req.city}` : ''}
                        </span>
                        <span>· {APPLICANT_TYPE_LABELS[req.applicantType] || req.applicantType}</span>
                        <span>· {req.uploadedDocs.length} مستندات مرفوعة</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-left pl-2">
                        <span className="text-sm font-black text-[#046A47] block">
                          {Number(req.requestedAmount || 0).toLocaleString('en-US')} ج.م
                        </span>
                        <span className="text-[10px] text-stone-500 font-bold">
                          {PLAN_LABELS[req.repaymentPlan] || req.repaymentPlan}
                        </span>
                      </div>

                      <select
                        value={req.status}
                        onChange={(e) =>
                          handleUpdateRequest(
                            req.id,
                            { status: e.target.value as IslamicFinancingRequest['status'] },
                            'تم تحديث حالة طلب التمويل'
                          )
                        }
                        className="p-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold focus:outline-none"
                      >
                        <option value="new">طلب جديد</option>
                        <option value="reviewing">قيد المراجعة</option>
                        <option value="approved">تمت الموافقة</option>
                        <option value="completed">مكتمل</option>
                        <option value="rejected">مرفوض</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setSelectedRequest(req)}
                        className="px-3.5 py-2 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>التفاصيل والمستندات</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMIZE FAQS, FORM QUESTIONS & UPLOAD REQUIREMENTS */}
      {subTab === 'config' && (
        <div className="space-y-6">
          {/* Headline Settings */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 space-y-3">
            <h3 className="text-sm font-black text-stone-900">عنوان ووصف صفحة التمويل الإسلامي</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">العنوان الرئيسي</label>
                <input
                  type="text"
                  value={config.headline || ''}
                  onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">الوصف المختصر</label>
                <input
                  type="text"
                  value={config.subheadline || ''}
                  onChange={(e) => setConfig({ ...config, subheadline: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* 1. Required Docs ("الحاجات اللي هتترفع") */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#046A47]" />
                <div>
                  <h3 className="text-sm font-black text-stone-900">
                    المستندات والأوراق التي سيرفعها العميل ({config.requiredDocs.length})
                  </h3>
                  <p className="text-[11px] text-stone-500">حدد أسماء الأوراق المطلوبة وهل هي إجبارية أم اختيارية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    requiredDocs: [
                      ...config.requiredDocs,
                      {
                        id: `doc-${Date.now()}`,
                        label: 'مستند جديد',
                        description: '',
                        required: false,
                      },
                    ],
                  })
                }
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مستند للرفع</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {config.requiredDocs.map((docReq, idx) => (
                <div
                  key={docReq.id}
                  className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center gap-2.5"
                >
                  <input
                    type="text"
                    value={docReq.label}
                    onChange={(e) => {
                      const next = [...config.requiredDocs];
                      next[idx] = { ...docReq, label: e.target.value };
                      setConfig({ ...config, requiredDocs: next });
                    }}
                    placeholder="اسم المستند"
                    className="flex-1 min-w-[180px] p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={docReq.description || ''}
                    onChange={(e) => {
                      const next = [...config.requiredDocs];
                      next[idx] = { ...docReq, description: e.target.value };
                      setConfig({ ...config, requiredDocs: next });
                    }}
                    placeholder="توضيح للعميل (اختياري)"
                    className="flex-1 min-w-[180px] p-2 bg-white border border-stone-200 rounded-xl text-xs"
                  />
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer px-2">
                    <input
                      type="checkbox"
                      checked={docReq.required}
                      onChange={(e) => {
                        const next = [...config.requiredDocs];
                        next[idx] = { ...docReq, required: e.target.checked };
                        setConfig({ ...config, requiredDocs: next });
                      }}
                      className="accent-[#046A47]"
                    />
                    <span>إجباري</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        requiredDocs: config.requiredDocs.filter((_, i) => i !== idx),
                      })
                    }
                    className="p-2 bg-rose-100 text-rose-700 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Custom Questions in Application Form */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-stone-900">
                  أسئلة إضافية في نموذج تقديم الطلب ({(config.customQuestions || []).length})
                </h3>
                <p className="text-[11px] text-stone-500">
                  أسئلة يجيب عليها العميل أثناء التقديم وتظهر لك مع الطلب
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    customQuestions: [
                      ...(config.customQuestions || []),
                      {
                        id: `q-${Date.now()}`,
                        label: 'سؤال جديد للعميل؟',
                        placeholder: 'إجابة العميل...',
                        required: false,
                      },
                    ],
                  })
                }
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة سؤال للنموذج</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {(config.customQuestions || []).map((q, idx) => (
                <div
                  key={q.id}
                  className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center gap-2.5"
                >
                  <input
                    type="text"
                    value={q.label}
                    onChange={(e) => {
                      const next = [...(config.customQuestions || [])];
                      next[idx] = { ...q, label: e.target.value };
                      setConfig({ ...config, customQuestions: next });
                    }}
                    placeholder="نص السؤال"
                    className="flex-1 min-w-[200px] p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                  />
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer px-2">
                    <input
                      type="checkbox"
                      checked={Boolean(q.required)}
                      onChange={(e) => {
                        const next = [...(config.customQuestions || [])];
                        next[idx] = { ...q, required: e.target.checked };
                        setConfig({ ...config, customQuestions: next });
                      }}
                      className="accent-[#046A47]"
                    />
                    <span>إلزامي</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        customQuestions: (config.customQuestions || []).filter((_, i) => i !== idx),
                      })
                    }
                    className="p-2 bg-rose-100 text-rose-700 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Customer-Facing FAQ Editor */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#046A47]" />
                <div>
                  <h3 className="text-sm font-black text-stone-900">
                    الأسئلة الشائعة الظاهرة للعملاء ({config.faqs.length})
                  </h3>
                  <p className="text-[11px] text-stone-500">تعديل وإضافة أسئلة وأجوبة شرح نظام التمويل الإسلامي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    faqs: [
                      ...config.faqs,
                      { id: `faq-${Date.now()}`, question: 'سؤال جديد؟', answer: '' },
                    ],
                  })
                }
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة سؤال شائع</span>
              </button>
            </div>

            <div className="space-y-3">
              {config.faqs.map((faq, idx) => (
                <div
                  key={faq.id}
                  className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const next = [...config.faqs];
                        next[idx] = { ...faq, question: e.target.value };
                        setConfig({ ...config, faqs: next });
                      }}
                      placeholder="السؤال..."
                      className="flex-1 p-2 bg-white border border-stone-200 rounded-xl text-xs font-black"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          faqs: config.faqs.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-2 bg-rose-100 text-rose-700 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => {
                      const next = [...config.faqs];
                      next[idx] = { ...faq, answer: e.target.value };
                      setConfig({ ...config, faqs: next });
                    }}
                    placeholder="الإجابة..."
                    className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-medium"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-6 py-3 bg-[#046A47] hover:bg-[#035237] text-white rounded-2xl text-sm font-black shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ جميع إعدادات التمويل الإسلامي</span>
            </button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: VIEW APPLICATION ANSWERS & UPLOADED DOCS */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 dir-rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="font-mono text-xs font-black text-[#046A47] bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                  {selectedRequest.requestNumber}
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  طلب التمويل — {selectedRequest.applicantName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div><strong>الهاتف:</strong> {selectedRequest.phone}</div>
              <div><strong>الموقع:</strong> {selectedRequest.governorate} - {selectedRequest.city || '-'}</div>
              <div><strong>الصفة:</strong> {APPLICANT_TYPE_LABELS[selectedRequest.applicantType]}</div>
              <div><strong>المساحة/النشاط:</strong> {selectedRequest.farmAreaOrScale || '-'}</div>
              <div><strong>المحاصيل:</strong> {selectedRequest.cropsOrActivity || '-'}</div>
              <div><strong>قيمة التمويل:</strong> {Number(selectedRequest.requestedAmount || 0).toLocaleString('en-US')} ج.م</div>
              <div><strong>خطة السداد:</strong> {PLAN_LABELS[selectedRequest.repaymentPlan]}</div>
              <div><strong>تاريخ الطلب:</strong> {selectedRequest.createdAt.slice(0, 10)}</div>
            </div>

            {/* Custom Question Answers */}
            {selectedRequest.customAnswers && Object.keys(selectedRequest.customAnswers).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-stone-800">إجابات الأسئلة الإضافية:</h4>
                <div className="space-y-1.5 bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100 text-xs">
                  {Object.entries(selectedRequest.customAnswers).map(([qId, ans]) => {
                    const qLabel =
                      (config.customQuestions || []).find((q) => q.id === qId)?.label || qId;
                    return (
                      <div key={qId}>
                        <strong className="text-stone-700 block">{qLabel}</strong>
                        <span className="text-stone-900">{ans || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uploaded Documents Preview Gallery */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-stone-800">
                المستندات والصور المرفوعة ({selectedRequest.uploadedDocs.length}):
              </h4>
              {selectedRequest.uploadedDocs.length === 0 ? (
                <p className="text-xs text-stone-400">لم يرفع العميل صوراً مع هذا الطلب.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedRequest.uploadedDocs.map((docItem, idx) => (
                    <div
                      key={idx}
                      className="border border-stone-200 rounded-2xl p-3 bg-stone-50/50 space-y-2"
                    >
                      <span className="text-xs font-black text-stone-800 block">
                        {docItem.label}
                      </span>
                      <div
                        onClick={() => setZoomedDocUrl(docItem.imageUrl)}
                        className="relative h-40 bg-white rounded-xl border border-stone-200 flex items-center justify-center overflow-hidden cursor-pointer group"
                      >
                        <img
                          src={docItem.imageUrl}
                          alt={docItem.label}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                          <ZoomIn className="w-3 h-3" />
                          <span>تكبير</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Basket Products if present */}
            {selectedRequest.linkedItems && selectedRequest.linkedItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-stone-800">
                  المنتجات المرفقة بالطلب ({selectedRequest.linkedItems.length}):
                </h4>
                <div className="space-y-1 bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs">
                  {selectedRequest.linkedItems.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.quantity} × {it.productName} ({it.packageDisplayName})</span>
                      <strong>{it.subtotal} ج.م</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Decision & Notes */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-black text-stone-700 block">ملاحظات لجنة التمويل:</label>
              <textarea
                rows={2}
                value={selectedRequest.adminNotes || ''}
                onChange={(e) =>
                  handleUpdateRequest(selectedRequest.id, { adminNotes: e.target.value })
                }
                placeholder="اكتب نتيجة المراجعة أو الضمانات..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <a
                  href={`https://wa.me/${selectedRequest.phone.replace(/[^0-9]/g, '').replace(/^0/, '20')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-[#25D366] hover:bg-[#1fb857] text-white rounded-xl text-xs font-black flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تواصل واتساب مع المتقدم</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateRequest(
                        selectedRequest.id,
                        { status: 'approved' },
                        'تم اعتماد طلب التمويل الإسلامي ✓'
                      )
                    }
                    className="px-4 py-2.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>موافقة مبدئية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Document Image Preview */}
      {zoomedDocUrl && (
        <div
          onClick={() => setZoomedDocUrl(null)}
          className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomedDocUrl}
            alt="Document preview"
            className="max-w-full max-h-[92vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
