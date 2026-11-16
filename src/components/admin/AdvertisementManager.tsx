import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  ArrowRight,
  Layers,
  Timer,
  Check,
  Eye,
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
  // Modal State for unified slide creation/editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<'hero' | 'ad'>('ad');
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  // Form Fields inside the Modal
  const [modalImageConfig, setModalImageConfig] = useState<BannerImageSettings>({
    url: '',
    position: 'center',
    height: 'standard',
    fit: 'cover',
  });
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubtitle, setModalSubtitle] = useState('');
  const [modalBadge, setModalBadge] = useState('');
  const [modalCtaText, setModalCtaText] = useState('');
  const [modalLink, setModalLink] = useState('');
  const [modalActive, setModalActive] = useState(true);
  const [modalShowOnline, setModalShowOnline] = useState(true);

  // Open Modal to Edit Primary Hero Slide
  const openHeroModal = () => {
    setModalTarget('hero');
    setEditingAd(null);
    setModalImageConfig(parseBannerUrlWithSettings(settings?.heroBannerUrl));
    setModalTitle(settings?.heroBannerTitle || '');
    setModalSubtitle(settings?.heroBannerSubtitle || '');
    setModalBadge(settings?.heroBannerBadge || '');
    setModalCtaText(settings?.heroBannerCtaText || '');
    setModalLink(settings?.heroBannerLink || '');
    setModalActive(true);
    setModalShowOnline(true);
    setIsModalOpen(true);
  };

  // Open Modal to Add a new Ad Slide
  const openAddAdModal = () => {
    setModalTarget('ad');
    setEditingAd(null);
    setModalImageConfig({
      url: '',
      position: 'center',
      height: 'standard',
      fit: 'cover',
    });
    setModalTitle('');
    setModalSubtitle('');
    setModalBadge('');
    setModalCtaText('');
    setModalLink('');
    setModalActive(true);
    setModalShowOnline(true);
    setIsModalOpen(true);
  };

  // Open Modal to Edit an existing Ad Slide
  const openEditAdModal = (ad: Advertisement) => {
    setModalTarget('ad');
    setEditingAd(ad);
    setModalImageConfig(parseBannerUrlWithSettings(ad.desktopImageUrl));
    setModalTitle(ad.title || '');
    setModalSubtitle(ad.description || '');
    setModalBadge('');
    setModalCtaText('');
    setModalLink(ad.link || '');
    setModalActive(ad.active);
    setModalShowOnline(ad.showOnline !== false);
    setIsModalOpen(true);
  };

  // Save Modal Action (Handles both Hero Slide and Ad Slides)
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();

    const finalImageUrl = createBannerUrlWithSettings(modalImageConfig);
    if (!finalImageUrl) {
      onShowToast('يرجى رفع أو إدخال رابط صورة البانر أولاً', 'error');
      return;
    }

    if (modalTarget === 'hero') {
      if (!settings || !onSaveSettings) {
        onShowToast('لا يمكن حفظ الإعدادات، يرجى المحاولة لاحقاً', 'error');
        return;
      }

      const updatedSettings: CatalogSettings = {
        ...settings,
        heroBannerMode: 'full_image',
        heroBannerUrl: finalImageUrl,
        heroBannerMobileUrl: finalImageUrl,
        heroBannerTitle: modalTitle.trim() || undefined,
        heroBannerSubtitle: modalSubtitle.trim() || undefined,
        heroBannerBadge: modalBadge.trim() || undefined,
        heroBannerCtaText: modalCtaText.trim() || undefined,
        heroBannerLink: modalLink.trim() || undefined,
      };

      onSaveSettings(updatedSettings);
      onShowToast('تم حفظ وضبط البانر الرئيسي في السلايدر بنجاح!', 'success');
      setIsModalOpen(false);
    } else {
      const slideTitle = modalTitle.trim();

      let updatedList: Advertisement[];
      if (editingAd) {
        updatedList = advertisements.map((a) =>
          a.id === editingAd.id
            ? {
                ...a,
                title: slideTitle || undefined,
                description: modalSubtitle.trim() || undefined,
                desktopImageUrl: finalImageUrl,
                mobileImageUrl: finalImageUrl,
                link: modalLink.trim() || undefined,
                active: modalActive,
                showOnline: modalShowOnline,
              }
            : a
        );
        onShowToast('تم تحديث شريحة البانر بنجاح', 'success');
      } else {
        const newAd: Advertisement = {
          id: 'ADV-' + Date.now(),
          title: slideTitle || undefined,
          description: modalSubtitle.trim() || undefined,
          desktopImageUrl: finalImageUrl,
          mobileImageUrl: finalImageUrl,
          link: modalLink.trim() || undefined,
          active: modalActive,
          showOnline: modalShowOnline,
          showPdf: true,
          placementType: 'after_product_count',
          placementValue: 4,
          displayOrder: advertisements.length + 1,
        };
        updatedList = [...advertisements, newAd];
        onShowToast('تمت إضافة شريحة البانر للسلايدر بنجاح', 'success');
      }

      onSaveAdvertisements(updatedList);
      setIsModalOpen(false);
    }
  };

  // Delete Ad Slide
  const handleDeleteAd = (id: string) => {
    if (confirm('هل تريد تأكيد حذف هذه الشريحة من السلايدر؟')) {
      onSaveAdvertisements(advertisements.filter((a) => a.id !== id));
      onShowToast('تم حذف شريحة البانر من السلايدر', 'success');
    }
  };

  // Toggle Ad Active Status
  const handleToggleAdActive = (id: string) => {
    const updated = advertisements.map((a) =>
      a.id === id ? { ...a, active: !a.active } : a
    );
    onSaveAdvertisements(updated);
    onShowToast('تم تغيير حالة تفعيل البانر', 'success');
  };

  // Remove Hero Banner
  const handleRemoveHeroBanner = () => {
    if (!settings || !onSaveSettings) return;
    if (
      confirm(
        'هل تريد إزالة البانر الرئيسي الأول؟ (ستستمر باقي شرائح السلايدر الإضافية بالدوران التلقائي بشكل طبيعي)'
      )
    ) {
      const updatedSettings: CatalogSettings = {
        ...settings,
        heroBannerUrl: undefined,
        heroBannerMobileUrl: undefined,
        heroBannerTitle: undefined,
        heroBannerSubtitle: undefined,
        heroBannerBadge: undefined,
        heroBannerCtaText: undefined,
        heroBannerLink: undefined,
      };
      onSaveSettings(updatedSettings);
      onShowToast('تمت إزالة البانر الرئيسي من السلايدر', 'success');
    }
  };

  // Calculate total active slides in the unified slider
  const hasHeroBanner = Boolean(settings?.heroBannerUrl);
  const heroConfig = parseBannerUrlWithSettings(settings?.heroBannerUrl);
  const activeAdsCount = advertisements.filter((a) => a.active && a.showOnline !== false).length;
  const totalActiveSlides = (hasHeroBanner ? 1 : 0) + activeAdsCount;

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Banner Header & Stats */}
      <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#046A47]" />
            <span>سلايدر البانرات والعروض المتحركة (الرئيسية)</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium mt-1">
            سلايدر موحد بمقاسات ثابتة ودوران تلقائي كل 4.5 ثوانٍ، مع إمكانية تحديد جزء الصورة المراد ظهوره بالضبط لكل بانر.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-2xl border border-[#E5E2D9] shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#046A47] flex items-center justify-center font-black text-sm">
            {totalActiveSlides > 0 ? totalActiveSlides : 4}
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-gray-900 block leading-tight">
              {totalActiveSlides > 0 ? `${totalActiveSlides} شرائح نشطة` : 'العروض الافتراضية نشطة'}
            </span>
            <span className="text-[10px] text-gray-500 font-bold block flex items-center gap-1">
              <Timer className="w-3 h-3 text-[#046A47]" />
              <span>تقليب تلقائي 4.5 ثوانٍ</span>
            </span>
          </div>
        </div>
      </div>

      {/* Reassurance Notice Box */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-950 font-bold">
        <Sparkles className="w-5 h-5 text-[#046A47] shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <span className="font-black block text-[#046A47]">
            نظام السلايدر الموحد بدون تعارض:
          </span>
          <span className="text-emerald-900 font-medium block">
            البانر الرئيسي الأول وجميع شرائح الإعلانات تعمل معاً كشريط متحرك واحد (Carousel Slider). لن يخفي أحدهما الآخر نهائياً، وسيتم تقليبها تلقائياً بالتايمر مع الحفاظ على مقاسات موحدة وثابتة.
          </span>
        </div>
      </div>

      {/* SECTION 1: PRIMARY HERO SLIDE */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#046A47]" />
              <span>الشريحة الأولى: البانر الرئيسي الأول (Hero Slide)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              هذه الشريحة تظهر كأول بانر في السلايدر عند فتح الصفحة الرئيسية للمتجر
            </p>
          </div>

          {hasHeroBanner ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openHeroModal}
                className="px-3.5 py-1.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>تعديل البانر والموضع</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveHeroBanner}
                className="p-1.5 bg-gray-100 hover:bg-rose-100 text-gray-600 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
                title="إزالة البانر الرئيسي"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openHeroModal}
              className="px-4 py-2 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تعيين البانر الرئيسي الأول</span>
            </button>
          )}
        </div>

        {hasHeroBanner && heroConfig.url ? (
          <div className="space-y-2">
            <div className="relative w-full h-36 sm:h-48 bg-stone-900 rounded-2xl overflow-hidden border border-gray-200">
              <img
                src={heroConfig.url}
                alt="البانر الرئيسي"
                className={`w-full h-full ${heroConfig.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                style={{ objectPosition: getBannerPositionStyle(heroConfig.position) }}
              />
              <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                موضع الظهور المحدد: {heroConfig.position === 'top' ? 'أعلى الصورة ⬆️' : heroConfig.position === 'bottom' ? 'أسفل الصورة ⬇️' : heroConfig.position === 'center' ? 'وسط الصورة ⏺️' : heroConfig.position}
              </div>
              <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                الشريحة الأولى (نشط)
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-1">
              <span>
                {settings?.heroBannerTitle ? `العنوان: ${settings.heroBannerTitle}` : 'بانر تصميم صورة كاملة'}
              </span>
              {settings?.heroBannerLink && (
                <span className="font-mono text-emerald-800 text-[11px] truncate max-w-xs">
                  الرابط: {settings.heroBannerLink}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#FAF8F5] border border-dashed border-[#D4D1C5] rounded-2xl p-6 text-center space-y-2">
            <ImageIcon className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-700">لم يتم تعيين صورة للبانر الرئيسي الأول بعد.</p>
            <p className="text-[11px] text-gray-500">
              يمكنك رفع بانر رئيسي الآن، أو الاكتفاء بالشرائح الإضافية بالأسفل.
            </p>
            <button
              type="button"
              onClick={openHeroModal}
              className="text-xs font-black text-[#046A47] hover:underline cursor-pointer inline-block pt-1"
            >
              + اضغط هنا لرفع البانر الرئيسي واختيار موضع ظهوره
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: ADDITIONAL SLIDER SLIDES */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>الشرائح الإضافية للسلايدر ({advertisements.length})</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              هذه الشرائح تضاف للسلايدر وتدور بالتناوب مع البانر الرئيسي كل 4.5 ثوانٍ
            </p>
          </div>

          <button
            type="button"
            onClick={openAddAdModal}
            className="bg-[#046A47] hover:bg-[#035237] text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شريحة بانر جديدة</span>
          </button>
        </div>

        {advertisements.length === 0 ? (
          <div className="bg-[#FAF8F5] border border-dashed border-[#D4D1C5] rounded-2xl p-10 text-center space-y-2.5">
            <Layers className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-700">لا توجد شرائح إضافية حالياً.</p>
            <p className="text-[11px] text-gray-500">
              عند إضافة شرائح إعلانية جديدة، ستقوم بالدوران تلقائياً بالتناوب في السلايدر الرئيسي.
            </p>
            <button
              type="button"
              onClick={openAddAdModal}
              className="px-4 py-2 bg-[#046A47] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer inline-flex items-center gap-1.5 hover:bg-[#035237]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أول شريحة الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advertisements.map((ad, index) => {
              const config = parseBannerUrlWithSettings(ad.desktopImageUrl);
              return (
                <div
                  key={ad.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${
                    ad.active
                      ? 'bg-white border-gray-200 hover:border-[#046A47] shadow-xs'
                      : 'bg-gray-50/80 border-gray-200 opacity-70'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                            شريحة #{index + 2}
                          </span>
                          <h4 className="font-black text-sm text-gray-900">{ad.title || 'بانر إعلاني'}</h4>
                        </div>
                        {ad.description && (
                          <p className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                            {ad.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAdActive(ad.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                            ad.active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                          title="تغيير حالة التفعيل"
                        >
                          {ad.active ? 'نشط' : 'معطل'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditAdModal(ad)}
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

                    {/* Image Preview with focal position */}
                    {config.url && (
                      <div className="relative w-full h-32 sm:h-36 bg-stone-900 rounded-2xl overflow-hidden border border-gray-200">
                        <img
                          src={config.url}
                          alt={ad.title || 'بانر'}
                          className={`w-full h-full ${config.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                          style={{ objectPosition: getBannerPositionStyle(config.position) }}
                        />
                        <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md">
                          موضع: {config.position === 'top' ? 'أعلى' : config.position === 'bottom' ? 'أسفل' : config.position === 'center' ? 'وسط' : config.position}
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
                        className="font-mono text-emerald-800 hover:underline truncate max-w-[220px]"
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
      </div>

      {/* ======================================================== */}
      {/* UNIFIED MODAL FOR ADDING / EDITING ANY BANNER SLIDE     */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 dir-rtl overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[#046A47]" />
                  <span>
                    {modalTarget === 'hero'
                      ? 'ضبط البانر الرئيسي الأول (Hero Slide)'
                      : editingAd
                        ? 'تعديل شريحة البانر'
                        : 'إضافة شريحة بانر جديدة للسلايدر'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  ارفع صورة البانر وحدد موضع ظهورها بدقة، مع إمكانية إضافة عنوان ورابط اختياري.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* STEP 1: IMAGE FILE UPLOAD */}
              <div className="space-y-1">
                <ImageFileInput
                  label="1. صورة البانر (اختر ملفاً من جهازك أو الصق رابط الصورة) *"
                  value={modalImageConfig.url}
                  onChange={(newUrl) =>
                    setModalImageConfig((prev) => ({ ...prev, url: newUrl }))
                  }
                  placeholder="اختر ملف صورة من جهازك (كمبيوتر أو موبايل)..."
                />
              </div>

              {/* STEP 2: IMMEDIATE VIEWPORT / FOCAL POINT SELECTOR */}
              {modalImageConfig.url ? (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-black text-gray-800 block">
                    2. اختر أي جزء يظهر من الصورة في السلايدر (أعلى / وسط / أسفل):
                  </label>
                  <BannerViewportSelector
                    title="تحديد جزء الظنوع وضبط الأبعاد الثابتة"
                    settings={modalImageConfig}
                    onChange={(updated) => setModalImageConfig(updated)}
                    showPreview={true}
                  />
                </div>
              ) : (
                <div className="bg-[#FAF8F5] border border-dashed border-gray-300 rounded-2xl p-4 text-center text-xs text-gray-500 font-medium">
                  📷 بعد اختيار الصورة من جهازك، ستظهر لك فوراً أزرار اختيار موضع الظهور (أعلى / وسط / أسفل) ومعاينة حية لشكل البانر.
                </div>
              )}

              {/* STEP 3: OPTIONAL DETAILS (NOT REQUIRED) */}
              <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200 space-y-3">
                <span className="text-xs font-black text-gray-800 block">
                  3. بيانات اختيارية (اتركها فارغة إذا كان التصميم يحتوي على النصوص):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      عنوان البانر (اختياري)
                    </label>
                    <input
                      type="text"
                      value={modalTitle}
                      onChange={(e) => setModalTitle(e.target.value)}
                      placeholder="مثال: خصم 20% على الأسمدة والمخصبات"
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      شارة البانر العلوية (اختياري)
                    </label>
                    <input
                      type="text"
                      value={modalBadge}
                      onChange={(e) => setModalBadge(e.target.value)}
                      placeholder="مثال: عرض الموسم 🔥"
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      الوصف المختصر (اختياري)
                    </label>
                    <input
                      type="text"
                      value={modalSubtitle}
                      onChange={(e) => setModalSubtitle(e.target.value)}
                      placeholder="مثال: شحن فوري لباب المزرعة والدفع كاش أو بالتقسيط الزراعي"
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      رابط عند الضغط على البانر (اختياري)
                    </label>
                    <div className="relative">
                      <ExternalLink className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        value={modalLink}
                        onChange={(e) => setModalLink(e.target.value)}
                        placeholder="https://... أو #catalog-products-section"
                        className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#046A47]"
                      />
                    </div>
                  </div>
                </div>

                {modalTarget === 'ad' && (
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={modalActive}
                        onChange={(e) => setModalActive(e.target.checked)}
                        className="w-4 h-4 text-[#046A47] rounded-md accent-[#046A47]"
                      />
                      <span>تفعيل الشريحة فورياً</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                      <input
                        type="checkbox"
                        checked={modalShowOnline}
                        onChange={(e) => setModalShowOnline(e.target.checked)}
                        className="w-4 h-4 text-[#046A47] rounded-md accent-[#046A47]"
                      />
                      <span>إظهار في المتجر الإلكتروني</span>
                    </label>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>حفظ ونشر الشريحة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
