import React, { useState } from 'react';
import {
  Settings,
  Save,
  QrCode,
  Phone,
  Mail,
  Globe,
  Palette,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  FileText,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { CatalogSettings } from '../../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { ImageFileInput } from '../common/ImageFileInput';

interface CatalogSettingsManagerProps {
  settings: CatalogSettings;
  onSaveSettings: (settings: CatalogSettings) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const CatalogSettingsManager: React.FC<CatalogSettingsManagerProps> = ({
  settings,
  onSaveSettings,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<CatalogSettings>({
    ...settings,
    primaryColor: settings.primaryColor || '#046A47',
    showPrices: settings.showPrices !== undefined ? settings.showPrices : true,
    showProductIds: settings.showProductIds !== undefined ? settings.showProductIds : true,
    showCharacteristics: settings.showCharacteristics !== undefined ? settings.showCharacteristics : true,
    showComposition: settings.showComposition !== undefined ? settings.showComposition : true,
    showUsage: settings.showUsage !== undefined ? settings.showUsage : true,
    pdfOrientation: settings.pdfOrientation || 'portrait',
    productsPerPage: settings.productsPerPage || 8,
  });

  const [activeTab, setActiveTab] = useState<string>('identity');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onShowToast('تم حفظ إعدادات الكتالوج وتجربة المستخدم بنجاح ✓', 'success');
  };

  const presetColors = [
    { name: 'أخضر زراعي نابض', hex: '#046A47' },
    { name: 'أخضر زمردي حديث', hex: '#059669' },
    { name: 'أخضر أرضي طبيعي', hex: '#5A5A40' },
    { name: 'كحلي وقور', hex: '#1E293B' },
  ];

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-700" />
              <span>إعدادات وتنسيق الكتالوج العام</span>
            </h2>
            <Badge variant="success">النظام المحدث</Badge>
          </div>
          <p className="text-xs text-stone-500 font-medium">
            تخصيص الهوية البصرية، أرقام التواصل السريع، خيارات تجربة المزارع، وإعدادات الطباعة
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          variant="default"
          size="lg"
          className="gap-2 shrink-0 self-end sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>حفظ التعديلات</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tabs Navigation */}
          <TabsList className="w-full justify-start overflow-x-auto bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/60 mb-6">
            <TabsTrigger value="identity" className="flex items-center gap-2 text-xs sm:text-sm">
              <Palette className="w-4 h-4 text-emerald-700" />
              <span>الهوية والبصريات</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2 text-xs sm:text-sm">
              <Smartphone className="w-4 h-4 text-[#25D366]" />
              <span>أرقام الواتساب والطلب السريع</span>
            </TabsTrigger>
            <TabsTrigger value="display" className="flex items-center gap-2 text-xs sm:text-sm">
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
              <span>تجربة المزارع وعرض المنتجات</span>
            </TabsTrigger>
            <TabsTrigger value="print" className="flex items-center gap-2 text-xs sm:text-sm">
              <QrCode className="w-4 h-4 text-amber-600" />
              <span>الباركود وطباعة الـ PDF</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: الهوية والبصريات */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
                  <Palette className="w-4 h-4 text-emerald-700" />
                  <span>بيانات الهوية والشعار</span>
                </CardTitle>
                <CardDescription>
                  اسم المتجر والشعار والصورة الترويجية التي تظهر في الواجهة للمزارعين
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800">عنوان الكتالوج الرئيسي</label>
                    <Input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="مثال: شركة كروپسا للمخصبات الزراعية"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800">العنوان الفرعي والوصفي</label>
                    <Input
                      type="text"
                      required
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="مثال: الكتالوج الديناميكي المعتمد لتحديث الأسعار الفوري"
                    />
                  </div>
                </div>

                {/* Logo & Top Banner Config */}
                <div className="space-y-5 pt-2">
                  {/* Logo Config */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
                    <ImageFileInput
                      label="شعار المتجر (Logo) — رفع صورة أو وضع رابط"
                      value={formData.logoUrl || ''}
                      onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  {/* Top Hero Banner Customization */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-4">
                    <div>
                      <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-700" />
                        <span>إعدادات البانر العلوي الرئيسي (Hero Banner)</span>
                      </h4>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">
                        اختر شكل البانر في الصفحة الرئيسية للموقع: سلايدر العروض، نص مع صورة، أو صورة تصميم كاملة
                      </p>
                    </div>

                    {/* Mode Radio Pills */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          id: 'default_carousel',
                          title: 'سلايدر العروض الافتراضي',
                          desc: 'عرض الشرائح التلقائية والإعلانات',
                        },
                        {
                          id: 'text_and_image',
                          title: 'كتابة نص + صورة',
                          desc: 'تكتب العنوان والوصف وتحط صورة جنبه',
                        },
                        {
                          id: 'full_image',
                          title: 'البانر كله صورة',
                          desc: 'رفع/وضع صورة تصميم كامل بعرض البانر',
                        },
                      ].map((mode) => {
                        const isSelected = (formData.heroBannerMode || 'default_carousel') === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                heroBannerMode: mode.id as CatalogSettings['heroBannerMode'],
                              })
                            }
                            className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white border-[#046A47] ring-2 ring-emerald-500/15 shadow-xs'
                                : 'bg-white/70 border-stone-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-stone-900">{mode.title}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-[#046A47]" />}
                            </div>
                            <span className="text-[11px] text-stone-500 font-medium block">
                              {mode.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Conditional Inputs for text_and_image OR full_image */}
                    {formData.heroBannerMode === 'text_and_image' && (
                      <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-800">عنوان البانر الرئيسي</label>
                            <Input
                              type="text"
                              value={formData.heroBannerTitle || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, heroBannerTitle: e.target.value })
                              }
                              placeholder="مثال: خصم 20% على الأسمدة والمخصبات الصيفية"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-800">الشارة الصغيرة (اختياري)</label>
                            <Input
                              type="text"
                              value={formData.heroBannerBadge || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, heroBannerBadge: e.target.value })
                              }
                              placeholder="مثال: عرض الموسم 🔥"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-800">النص الوصفي</label>
                            <Input
                              type="text"
                              value={formData.heroBannerSubtitle || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, heroBannerSubtitle: e.target.value })
                              }
                              placeholder="مثال: شحن سريع لباب المزرعة والدفع كاش أو تقسيط"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-800">نص الزر (اختياري)</label>
                            <Input
                              type="text"
                              value={formData.heroBannerCtaText || ''}
                              onChange={(e) =>
                                setFormData({ ...formData, heroBannerCtaText: e.target.value })
                              }
                              placeholder="مثال: تصفح العروض الآن"
                            />
                          </div>
                        </div>

                        <ImageFileInput
                          label="صورة البانر المصاحبة للنص (رفع صورة أو رابط)"
                          value={formData.heroBannerUrl || ''}
                          onChange={(url) => setFormData({ ...formData, heroBannerUrl: url })}
                          placeholder="https://example.com/banner-image.jpg"
                        />

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-stone-800">
                            رابط عند الضغط على الزر (اختياري)
                          </label>
                          <Input
                            type="text"
                            value={formData.heroBannerLink || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, heroBannerLink: e.target.value })
                            }
                            placeholder="https://... أو اتركه فارغاً"
                          />
                        </div>
                      </div>
                    )}

                    {formData.heroBannerMode === 'full_image' && (
                      <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-4">
                        <ImageFileInput
                          label="صورة البانر الكاملة (تظهر كصورة بعرض البانر بالكامل)"
                          value={formData.heroBannerUrl || ''}
                          onChange={(url) => setFormData({ ...formData, heroBannerUrl: url })}
                          placeholder="https://example.com/full-banner.jpg"
                        />

                        <ImageFileInput
                          label="صورة مخصصة للموبايل (اختياري — لو نفس الصورة اتركه فارغاً)"
                          value={formData.heroBannerMobileUrl || ''}
                          onChange={(url) => setFormData({ ...formData, heroBannerMobileUrl: url })}
                          placeholder="https://example.com/mobile-banner.jpg"
                        />

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-stone-800">
                            رابط عند الضغط على صورة البانر (اختياري)
                          </label>
                          <Input
                            type="text"
                            value={formData.heroBannerLink || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, heroBannerLink: e.target.value })
                            }
                            placeholder="https://... أو اتركه فارغاً"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Color Palette */}
                <div className="pt-2">
                  <label className="text-xs font-black text-stone-900 block mb-2">
                    لون الهوية الرئيسي للأزرار والعناصر
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {presetColors.map((c) => (
                      <button
                        type="button"
                        key={c.hex}
                        onClick={() => setFormData({ ...formData, primaryColor: c.hex })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                          formData.primaryColor === c.hex
                            ? 'border-stone-900 bg-stone-100 shadow-xs'
                            : 'border-stone-200 hover:border-stone-400 bg-white'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full shadow-2xs"
                          style={{ backgroundColor: c.hex }}
                        ></span>
                        <span>{c.name}</span>
                        {formData.primaryColor === c.hex && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 mr-1" />
                        )}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 pr-3">
                      <span className="text-xs text-stone-500 font-medium">أو اختر كود:</span>
                      <Input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                        className="w-28 h-9 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: التواصل والواتساب السريع */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
                  <Smartphone className="w-4 h-4 text-[#25D366]" />
                  <span>أرقام المبيعات وربط الواتساب السريع للمزارعين</span>
                </CardTitle>
                <CardDescription>
                  المزارع والتاجر يفضل التواصل والطلب المباشر السريع بدون خطوات معقدة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>رقم هاتف المبيعات (اتصال مباشر)</span>
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="مثال: 01000000000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]"></span>
                      <span>رقم الواتساب الرسمي المعتمد للطلبات (بصيغة دولية)</span>
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.whatsApp}
                      onChange={(e) => setFormData({ ...formData, whatsApp: e.target.value })}
                      placeholder="مثال: 201000000000"
                    />
                    <span className="text-[11px] text-stone-500 font-medium block">
                      مهم: اكتب الرقم مسبوقاً بكود الدولة (مثلاً 20 لمصر) ليعمل رابط الواتساب مباشرة عند ضغط المزارع
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-600" />
                      <span>البريد الإلكتروني للشركة</span>
                    </label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@cropsa-agri.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-stone-600" />
                      <span>الموقع الرسمي للمتجر</span>
                    </label>
                    <Input
                      type="text"
                      required
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="www.cropsa-agri.com"
                    />
                  </div>
                </div>

                {/* Order Webhook URL Config */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2.5">
                  <label className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-sky-600" />
                    <span>رابط استقبال الفواتير التلقائي (Order Webhook / Notification URL)</span>
                  </label>
                  <Input
                    type="url"
                    value={formData.orderWebhookUrl || ''}
                    onChange={(e) => setFormData({ ...formData, orderWebhookUrl: e.target.value })}
                    placeholder="https://hook.eu1.make.com/... أو رابط نظام الرسائل الخاص بك"
                    className="bg-white font-mono text-xs"
                  />
                  <p className="text-[11px] text-sky-900 font-medium leading-relaxed">
                    عند إتمام أي طلبية (كاش أو تقسيط)، يرسل النظام الفاتورة تلقائياً لهذا الرابط (JSON) شاملة:
                    اسم العميل، رقم الهاتف، قيمة الفاتورة، نوع الدفع، تفاصيل المنتجات، نص الرسالة (messageBody)، ورابط إجراء مباشر للموظف لفتح الطلبية في الموقع.
                  </p>
                </div>

                {/* WhatsApp Order Preview box */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>طريقة عمل زر "اطلب واتساب فوراً" للمزارع:</span>
                    </span>
                    <Badge variant="whatsapp">مفعل تلقائياً</Badge>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    عند ضغط المزارع أو التاجر على أي منتج، يُفتح تطبيق الواتساب فوراً برسالة جاهزة تحتوي على (اسم المنتج، حجم العبوة، السعر الحالي، واسم الشركة) دون الحاجة لملء أي نماذج شحن معقدة.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: تجربة المزارع وعرض المنتجات */}
          <TabsContent value="display" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
                  <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                  <span>تخصيص تجربة العرض والتبسيط للمزارع والتاجر</span>
                </CardTitle>
                <CardDescription>
                  التحكم في سهولة ووضوح البيانات المعروضة في كروت المنتجات والقوائم
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Toggle 1: Show Prices */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-stone-900 block">
                        إظهار الأسعار بشكل مباشر في الكتالوج
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium block">
                        عند التفعيل يظهر السعر بالجنيه بوضوح بجانب كل عبوة، وعند التعطيل يُستبدل بـ "السعر عند الطلب"
                      </span>
                    </div>
                    <Switch
                      checked={formData.showPrices}
                      onCheckedChange={(checked) => setFormData({ ...formData, showPrices: checked })}
                    />
                  </div>

                  {/* Toggle 2: Show Product IDs */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-stone-900 block">
                        إظهار كود الصنف الزراعي (Product ID)
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium block">
                        يساعد التجار في التعرف السريع على كود المنتج في الفواتير (مثال: CR-FERT-01)
                      </span>
                    </div>
                    <Switch
                      checked={formData.showProductIds}
                      onCheckedChange={(checked) => setFormData({ ...formData, showProductIds: checked })}
                    />
                  </div>

                  {/* Toggle 3: Technical Specs */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                    <div className="space-y-1">
                      <span className="text-xs font-black text-stone-900 block">
                        إظهار التركيب الفني ومعدلات الاستخدام
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium block">
                        إبراز المادة الفعالة ونسب NPK وجرعات الرش في تفاصيل المنتج
                      </span>
                    </div>
                    <Switch
                      checked={Boolean(formData.showComposition)}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          showComposition: checked,
                          showCharacteristics: checked,
                          showUsage: checked,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="pt-2 max-w-xs space-y-1.5">
                  <label className="text-xs font-bold text-stone-800 block">
                    عدد المنتجات المعروضة في الصفحة الواحدة
                  </label>
                  <Input
                    type="number"
                    min={4}
                    max={24}
                    value={formData.productsPerPage}
                    onChange={(e) => setFormData({ ...formData, productsPerPage: Number(e.target.value) || 8 })}
                  />
                  <span className="text-[11px] text-stone-500 font-medium">
                    يُنصح باختيار 8 أو 12 منتج لضمان سرعة التحميل على شبكات 3G/4G في الأراضي الزراعية
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: الباركود والطباعة */}
          <TabsContent value="print" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
                  <QrCode className="w-4 h-4 text-amber-600" />
                  <span>باركود الـ QR الرقمي وإعدادات كتالوج الـ PDF</span>
                </CardTitle>
                <CardDescription>
                  طباعة الكتالوج الورقي والملصقات مع باركود فوري يفتحه المزارع بكاميرا الموبايل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-800 block">
                        رابط كود الـ QR للكتالوج الرقمي
                      </label>
                      <Input
                        type="url"
                        required
                        value={formData.qrCodeUrl}
                        onChange={(e) => setFormData({ ...formData, qrCodeUrl: e.target.value })}
                        placeholder="https://api.qrserver.com/..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-stone-800 block">
                        نص تذييل الصفحات وحقوق النشر (Footer Copyright)
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.footerText}
                        onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                        placeholder="جميع الحقوق محفوظة لشركة كروپسا للحلول الزراعية"
                      />
                    </div>
                  </div>

                  {/* QR Live Card */}
                  <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-28 h-28 bg-white p-2 rounded-2xl shadow-xs border border-stone-200 flex items-center justify-center">
                      {formData.qrCodeUrl ? (
                        <img
                          src={formData.qrCodeUrl}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="w-12 h-12 text-stone-300" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-amber-950">
                      معاينة باركود الـ QR المطبوع
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium max-w-xs">
                      عند مسح هذا الكود في المعارض أو المزارع، ينتقل العميل مباشرة للكتالوج الرقمي بآخر تحديث للأسعار
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Bottom Bar with Save Button */}
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="default" size="lg" className="gap-2 shadow-md">
            <Save className="w-4 h-4" />
            <span>حفظ كل الإعدادات</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
