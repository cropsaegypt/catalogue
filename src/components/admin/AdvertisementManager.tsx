import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  Layout,
  Sliders,
  Save,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  HelpCircle,
  ArrowRight,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { Advertisement, CatalogSettings } from '../../types';
import { ImageFileInput } from '../common/ImageFileInput';
import { BannerViewportSelector } from './BannerViewportSelector';
import {
  BannerImageSettings,
  parseBannerUrlWithSettings,
  createBannerUrlWithSettings,
  getBannerHeightClass,
  getBannerPositionStyle,
} from '../../utils/bannerHelper';

interface AdvertisementManagerProps {
  advertisements: Advertisement[];
  settings?: CatalogSettings;
  onSaveAdvertisements: (ads: Advertisement[]) => void;
  onSaveSettings?: (settings: CatalogSettings) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdvertisementManager: React.FC<AdvertisementManagerProps> = ({
  advertisements,
  settings,
  onSaveAdvertisements,
  onSaveSettings,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'hero' | 'carousel'>('hero');

  // ==========================================
  // 1. HERO BANNER STATE (from settings)
  // ==========================================
  const [heroMode, setHeroMode] = useState<CatalogSettings['heroBannerMode']>(
    settings?.heroBannerMode || 'default_carousel'
  );
  const [heroTitle, setHeroTitle] = useState(settings?.heroBannerTitle || '');
  const [heroSubtitle, setHeroSubtitle] = useState(settings?.heroBannerSubtitle || '');
  const [heroBadge, setHeroBadge] = useState(settings?.heroBannerBadge || '');
  const [heroCtaText, setHeroCtaText] = useState(settings?.heroBannerCtaText || '');
  const [heroLink, setHeroLink] = useState(settings?.heroBannerLink || '');

  // Desktop Banner Settings (URL + Position + Height + Fit)
  const [desktopBannerConfig, setDesktopBannerConfig] = useState<BannerImageSettings>(() =>
    parseBannerUrlWithSettings(settings?.heroBannerUrl)
  );

  // Mobile Banner Settings
  const [mobileBannerConfig, setMobileBannerConfig] = useState<BannerImageSettings>(() =>
    parseBannerUrlWithSettings(settings?.heroBannerMobileUrl || settings?.heroBannerUrl)
  );

  const [useSeparateMobileImage, setUseSeparateMobileImage] = useState<boolean>(
    Boolean(settings?.heroBannerMobileUrl && settings.heroBannerMobileUrl !== settings.heroBannerUrl)
  );

  const handleSaveHeroBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !onSaveSettings) {
      onShowToast('لا يمكن حفظ الإعدادات، يرجى المحاولة لاحقاً', 'error');
      return;
    }

    const finalHeroUrl = createBannerUrlWithSettings(desktopBannerConfig);
    const finalMobileUrl = useSeparateMobileImage
      ? createBannerUrlWithSettings(mobileBannerConfig)
      : finalHeroUrl;

    const updatedSettings: CatalogSettings = {
      ...settings,
      heroBannerMode: heroMode,
      heroBannerUrl: finalHeroUrl,
      heroBannerMobileUrl: finalMobileUrl,
      heroBannerTitle: heroTitle.trim() || undefined,
      heroBannerSubtitle: heroSubtitle.trim() || undefined,
      heroBannerBadge: heroBadge.trim() || undefined,
      heroBannerCtaText: heroCtaText.trim() || undefined,
      heroBannerLink: heroLink.trim() || undefined,
    };

    onSaveSettings(updatedSettings);
    onShowToast('تم حفظ ونشر بانر الصفحة الرئيسية بنجاح!', 'success');
  };

  // ==========================================
  // 2. CAROUSEL ADS STATE
  // ==========================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adActive, setAdActive] = useState(true);
  const [adShowOnline, setAdShowOnline] = useState(true);
  const [adConfig, setAdConfig] = useState<BannerImageSettings>({
    url: '',
    position: 'center',
    height: 'standard',
    fit: 'cover',
  });

  const openAddModal = () => {
    setEditingAd(null);
    setAdTitle('');
    setAdDescription('');
    setAdLink('');
    setAdActive(true);
    setAdShowOnline(true);
    setAdConfig({
      url: '',
      position: 'center',
      height: 'standard',
      fit: 'cover',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setAdTitle(ad.title);
    setAdDescription(ad.description || '');
    setAdLink(ad.link || '');
    setAdActive(ad.active);
    setAdShowOnline(ad.showOnline !== false);
    setAdConfig(parseBannerUrlWithSettings(ad.desktopImageUrl));
    setIsModalOpen(true);
  };

  const handleSaveAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim()) {
      onShowToast('يرجى إدخال عنوان للإعلان', 'error');
      return;
    }

    const finalAdImageUrl = createBannerUrlWithSettings(adConfig);

    let updatedList: Advertisement[];

    if (editingAd) {
      updatedList = advertisements.map((a) =>
        a.id === editingAd.id
          ? {
              ...a,
              title: adTitle.trim(),
              description: adDescription.trim() || undefined,
              desktopImageUrl: finalAdImageUrl,
              link: adLink.trim() || undefined,
              active: adActive,
              showOnline: adShowOnline,
            }
          : a
      );
      onShowToast('تم تحديث شريحة الإعلان بنجاح', 'success');
    } else {
      const newAd: Advertisement = {
        id: 'ADV-' + Date.now(),
        title: adTitle.trim(),
        description: adDescription.trim() || undefined,
        desktopImageUrl: finalAdImageUrl,
        link: adLink.trim() || undefined,
        active: adActive,
        showOnline: adShowOnline,
        showPdf: true,
        placementType: 'after_product_count',
        placementValue: 4,
        displayOrder: advertisements.length + 1,
      };
      updatedList = [...advertisements, newAd];
      onShowToast('تم إضافة شريحة الإعلان للرئيسية بنجاح', 'success');
    }

    onSaveAdvertisements(updatedList);
    setIsModalOpen(false);
  };

  const handleDeleteAd = (id: string) => {
    if (confirm('هل تريد تأكيد حذف هذا الإعلان من السلايدر؟')) {
      onSaveAdvertisements(advertisements.filter((a) => a.id !== id));
      onShowToast('تم حذف الإعلان', 'success');
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Main Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#046A47]" />
            <span>بانرات الصفحة الرئيسية والإعلانات</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium mt-0.5">
            تحكم كامل في البانر الكبير أعلى الرئيسية، ورفع الصور واختيار الجزء المراد ظهوره بالضبط
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#E5E2D9] p-1 rounded-2xl border border-[#D4D1C5] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('hero')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hero' ? 'bg-[#046A47] text-white shadow-xs' : 'text-[#2D2D24] hover:text-[#046A47]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>بانر الهيدر الرئيسي (Hero Banner)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('carousel')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'carousel' ? 'bg-[#046A47] text-white shadow-xs' : 'text-[#2D2D24] hover:text-[#046A47]'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>شرائح السلايدر الإعلاني ({advertisements.length})</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: HERO BANNER MANAGEMENT (Top Banner on Home Page) */}
      {/* ======================================================== */}
      {activeTab === 'hero' && (
        <form onSubmit={handleSaveHeroBanner} className="space-y-6">
          {/* Mode Switcher */}
          <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-900">طريقة عرض البانر أعلى الصفحة الرئيسية:</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                اختر النمط المناسب لمتجرك، ويمكنك معاينة النتيجة فورياً بالأسفل
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'full_image',
                  title: 'بانر صورة كاملة مصممة (Full Image)',
                  desc: 'رفع صورة مصممة وجاهزة بالكامل (المقاس المثالي 1200×300) مع تحديد جزء الظهور',
                  badge: 'الأكثر استخداماً ⭐',
                },
                {
                  id: 'text_and_image',
                  title: 'بانر نصوص وزر + صورة جانبية',
                  desc: 'تصميم تفاعلي بخلفية ملونة مع عنوان، وصف، زر تسوق، وصورة منتج جانبية',
                },
                {
                  id: 'default_carousel',
                  title: 'سلايدر العروض التفاعلي الافتراضي',
                  desc: 'عرض شرائح عروض كروپسا المتحركة مع عروض التقسيط والشحن والخصومات',
                },
              ].map((mode) => {
                const isSelected = (heroMode || 'default_carousel') === mode.id;
                return (
                  <div
                    key={mode.id}
                    onClick={() => setHeroMode(mode.id as any)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#046A47] bg-emerald-50/40 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs text-gray-900">{mode.title}</span>
                        {mode.badge && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full">
                            {mode.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{mode.desc}</p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-gray-100 flex items-center gap-1.5 text-[11px] font-bold">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#046A47] bg-[#046A47]' : 'border-gray-400'}`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className={isSelected ? 'text-[#046A47]' : 'text-gray-500'}>
                        {isSelected ? 'مفعل حالياً' : 'اضغط للتفعيل'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration when Full Image is selected */}
          {heroMode === 'full_image' && (
            <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900">رفع وضبط صورة البانر الرئيسي:</h3>
                <p className="text-xs text-gray-500 font-medium">
                  ارفع صورة البانر من جهازك (كمبيوتر أو موبايل)، وحدد بدقة الجزء الذي يظهر منها والارتفاع
                </p>
              </div>

              {/* 1. Image Upload Component */}
              <div className="space-y-4">
                <ImageFileInput
                  label="صورة البانر لشاشات الكمبيوتر والتابلت (Desktop):"
                  value={desktopBannerConfig.url}
                  onChange={(newUrl) =>
                    setDesktopBannerConfig((prev) => ({
                      ...prev,
                      url: newUrl,
                    }))
                  }
                  placeholder="اختر ملف صورة من جهازك أو ضع رابط الصورة..."
                />

                {/* 2. Visual Viewport & Focal Point Selector */}
                {desktopBannerConfig.url && (
                  <BannerViewportSelector
                    title="تحديد موضع ظهور الصورة والارتفاع (كمبيوتر)"
                    settings={desktopBannerConfig}
                    onChange={(updated) => setDesktopBannerConfig(updated)}
                  />
                )}
              </div>

              {/* 3. Link Action */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200 space-y-2">
                <label className="text-xs font-bold text-gray-700 block">
                  رابط فتح أو توجيه عند الضغط على البانر (اختياري):
                </label>
                <div className="relative">
                  <ExternalLink className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    value={heroLink}
                    onChange={(e) => setHeroLink(e.target.value)}
                    placeholder="مثال: https://cropsa.org أو #catalog-products-section"
                    className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47]"
                  />
                </div>
                <span className="text-[10px] text-gray-500 block">
                  إذا تركته فارغاً سينزل البانر تلقائياً لقسم المنتجات عند الضغط عليه.
                </span>
              </div>
            </div>
          )}

          {/* Configuration when Text & Image is selected */}
          {heroMode === 'text_and_image' && (
            <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-900">نصوص وصورة البانر التفاعلي:</h3>
                <p className="text-xs text-gray-500 font-medium">اكتب عنوان البانر والشارة وارفع الصورة الجانبية</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">شارة البانر العلوية</label>
                  <input
                    type="text"
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    placeholder="مثال: عروض الموسم الزراعي 🔥"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">العنوان الرئيسي للبانر</label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="مثال: خصومات حصرية على جميع الأسمدة والمبيدات"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">الوصف المختصر</label>
                  <input
                    type="text"
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="مثال: احصل على خصم 15% على جميع طلبيات الجملة مع شحن فوري"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">نص زر الإجراء (CTA)</label>
                  <input
                    type="text"
                    value={heroCtaText}
                    onChange={(e) => setHeroCtaText(e.target.value)}
                    placeholder="مثال: تسوق العروض الآن"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">رابط الزر</label>
                  <input
                    type="text"
                    value={heroLink}
                    onChange={(e) => setHeroLink(e.target.value)}
                    placeholder="#catalog-products-section أو رابط موقع"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              {/* Side Image Upload & Viewport */}
              <div className="pt-3 border-t border-gray-100 space-y-4">
                <ImageFileInput
                  label="الصورة الجانبية للبانر:"
                  value={desktopBannerConfig.url}
                  onChange={(newUrl) =>
                    setDesktopBannerConfig((prev) => ({
                      ...prev,
                      url: newUrl,
                    }))
                  }
                  placeholder="اختر ملف صورة من جهازك أو ضع رابط الصورة..."
                />

                {desktopBannerConfig.url && (
                  <BannerViewportSelector
                    title="تحديد جزء ظهور الصورة الجانبية"
                    settings={desktopBannerConfig}
                    onChange={(updated) => setDesktopBannerConfig(updated)}
                    showPreview={false}
                  />
                )}
              </div>
            </div>
          )}

          {/* Configuration when Carousel is selected */}
          {heroMode === 'default_carousel' && (
            <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#046A47] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">سلايدر العروض التفاعلي نشط حالياً</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    يحتوي على شرائح التقسيط الزراعي، وتوصيل الطلبيات، والمبيدات المعتمدة، وأي إعلانات تضيفها من تبويب "شرائح السلايدر الإعلاني"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Save Button Bar */}
          <div className="bg-white p-4 rounded-3xl border border-[#E5E2D9] shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600">
              احفظ التغييرات لتنعكس فوراً على واجهة المتجر الرئيسية للعملاء
            </span>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>حفظ ونشر بانر الرئيسية</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CAROUSEL ADS MANAGEMENT (Ad Slides)              */}
      {/* ======================================================== */}
      {activeTab === 'carousel' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-[#E5E2D9] shadow-xs">
            <div>
              <h3 className="text-sm font-black text-gray-900">شرائح السلايدر الترويجي:</h3>
              <p className="text-xs text-gray-500 font-medium">
                هذه الشرائح تظهر بالتناوب في السلايدر المتحرك بالصفحة الرئيسية وفي ملفات الكتالوج PDF
              </p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="bg-[#046A47] hover:bg-[#035237] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شريحة إعلان جديدة</span>
            </button>
          </div>

          {advertisements.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#E5E2D9] text-center space-y-3">
              <Megaphone className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-600">لم تقم بإضافة أي شرائح إعلانية مخصصة بعد.</p>
              <button
                type="button"
                onClick={openAddModal}
                className="text-xs font-black text-[#046A47] hover:underline"
              >
                اضغط هنا لإضافة أول شريحة إعلانية مع صورة وروابط
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {advertisements.map((ad) => {
                const config = parseBannerUrlWithSettings(ad.desktopImageUrl);
                return (
                  <div
                    key={ad.id}
                    className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#046A47] transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-gray-900">{ad.title}</h4>
                            <span
                              className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                                ad.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {ad.active ? 'نشط' : 'معطل'}
                            </span>
                          </div>
                          {ad.description && (
                            <p className="text-xs text-gray-500 font-medium line-clamp-2 mt-0.5">
                              {ad.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditModal(ad)}
                            className="p-1.5 bg-gray-100 hover:bg-emerald-100 hover:text-emerald-800 text-gray-700 rounded-lg transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAd(ad.id)}
                            className="p-1.5 bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-700 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Image Preview with Viewport Position */}
                      {config.url && (
                        <div className="relative w-full h-36 bg-stone-900 rounded-2xl overflow-hidden border border-gray-200">
                          <img
                            src={config.url}
                            alt={ad.title}
                            className={`w-full h-full ${config.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                            style={{ objectPosition: getBannerPositionStyle(config.position) }}
                          />
                          <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md">
                            موضع: {config.position}
                          </span>
                        </div>
                      )}
                    </div>

                    {ad.link && (
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                        <span>الرابط:</span>
                        <a
                          href={ad.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-emerald-800 hover:underline truncate max-w-[200px]"
                        >
                          {ad.link}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal to Add/Edit Ad Slide */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 dir-rtl overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-900">
                    {editingAd ? 'تعديل شريحة الإعلان' : 'إضافة شريحة إعلانية جديدة'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-700 text-lg font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveAd} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">عنوان الإعلان *</label>
                    <input
                      type="text"
                      required
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      placeholder="مثال: خصم 20% على سماد السوبر فوسفات"
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">وصف الإعلان (اختياري)</label>
                    <textarea
                      rows={2}
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                      placeholder="شرح إضافي يظهر تحت العنوان..."
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold"
                    />
                  </div>

                  {/* Direct File Upload via ImageFileInput */}
                  <ImageFileInput
                    label="صورة الإعلان (اختر ملفاً من جهازك أو أدخل الرابط):"
                    value={adConfig.url}
                    onChange={(newUrl) => setAdConfig((prev) => ({ ...prev, url: newUrl }))}
                    placeholder="اختر صورة البانر من جهازك..."
                  />

                  {/* Viewport Position Selector */}
                  {adConfig.url && (
                    <BannerViewportSelector
                      title="تحديد جزء ظهور صورة الإعلان"
                      settings={adConfig}
                      onChange={(updated) => setAdConfig(updated)}
                    />
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">رابط التوجيه (اختياري)</label>
                    <input
                      type="text"
                      value={adLink}
                      onChange={(e) => setAdLink(e.target.value)}
                      placeholder="https://... أو #catalog-products-section"
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={adActive}
                        onChange={(e) => setAdActive(e.target.checked)}
                        className="w-4 h-4 text-[#046A47] rounded-md accent-[#046A47]"
                      />
                      <span>تفعيل الإعلان فورياً</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={adShowOnline}
                        onChange={(e) => setAdShowOnline(e.target.checked)}
                        className="w-4 h-4 text-[#046A47] rounded-md accent-[#046A47]"
                      />
                      <span>إظهار في المتجر الإلكتروني</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                    >
                      حفظ الشريحة
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
