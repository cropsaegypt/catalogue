import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, ChevronLeft, Percent, ShieldCheck, Truck, CreditCard, ArrowLeft } from 'lucide-react';
import { Advertisement, CatalogSettings } from '../../types';

interface OffersBannerCarouselProps {
  advertisements?: Advertisement[];
  settings?: CatalogSettings;
  onSelectCategory?: (catId: string) => void;
  onOpenInstallmentInfo?: () => void;
}

interface BannerSlide {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  highlight: string;
  description: string;
  ctaText: string;
  bgGradient: string;
  icon: React.ReactNode;
  imageUrl?: string;
  actionType: 'category' | 'installment' | 'filter' | 'link';
  actionTarget?: string;
}

export const OffersBannerCarousel: React.FC<OffersBannerCarouselProps> = ({
  advertisements = [],
  settings,
  onSelectCategory,
  onOpenInstallmentInfo,
}) => {
  // Built-in high-converting agricultural offer banners + any custom ads
  const defaultSlides: BannerSlide[] = [
    {
      id: 'offer-1',
      badge: 'عرض الموسم الزراعي 🔥',
      badgeColor: 'bg-amber-400 text-gray-950',
      title: 'خصم حتى 20% على طلبيات الجملة',
      highlight: 'أسمدة ومخصبات عالية النقاوة',
      description: 'أسعار خاصة للمزارع الكبرى والموزعين مع كود الخصم الزراعي CROPSA20',
      ctaText: 'تسوق العرض الآن',
      bgGradient: 'from-[#046A47] via-[#035A3C] to-[#023E29]',
      icon: <Percent className="w-6 h-6 text-amber-300" />,
      actionType: 'category',
      actionTarget: 'CAT-01',
    },
    {
      id: 'offer-2',
      badge: 'تسهيلات مزارعي مصر 🌾',
      badgeColor: 'bg-emerald-100 text-[#046A47]',
      title: 'برنامج التقسيط الزراعي الميسر',
      highlight: 'قسّط حتى 12 شهراً والدفع بعد الحصاد',
      description: 'احصل على كل أسمدتك ومبيداتك الآن وسدد بأقساط ميسرة وبدون تعقيدات بنكية',
      ctaText: 'تفاصيل التقسيط والطلب',
      bgGradient: 'from-[#1E3A8A] via-[#1E293B] to-[#0F172A]',
      icon: <CreditCard className="w-6 h-6 text-sky-400" />,
      actionType: 'installment',
    },
    {
      id: 'offer-3',
      badge: 'مركبات موثقة 100% 🛡️',
      badgeColor: 'bg-rose-100 text-rose-800',
      title: 'مبيدات حشائش وفطريات معتمدة',
      highlight: 'مكافحة متكاملة من كبرى الشركات',
      description: 'أفضل المبيدات الأصلية المسجلة بوزارة الزراعة لحماية المحصول وزيادة الإنتاج',
      ctaText: 'عرض قائمة المبيدات',
      bgGradient: 'from-[#831843] via-[#701A75] to-[#4C0519]',
      icon: <ShieldCheck className="w-6 h-6 text-rose-300" />,
      actionType: 'category',
      actionTarget: 'CAT-03',
    },
    {
      id: 'offer-4',
      badge: 'توصيل مباشر وسريع 🚚',
      badgeColor: 'bg-amber-100 text-amber-900',
      title: 'شحن مباشر لباب المزرعة والمخزن',
      highlight: 'معاينة واستلام ودفع كاش عند الوصول',
      description: 'تغطية شاملة لجميع المحافظات: البحيرة، النوبارية، الشرقية، الصعيد، والدلتا',
      ctaText: 'اطلب طلبيتك الآن',
      bgGradient: 'from-[#14532D] via-[#064E3B] to-[#022C22]',
      icon: <Truck className="w-6 h-6 text-emerald-300" />,
      actionType: 'filter',
    },
  ];

  // Convert custom advertisements to slides if any
  const customSlides: BannerSlide[] = advertisements
    .filter((ad) => ad.active && ad.showOnline)
    .map((ad) => ({
      id: ad.id,
      badge: 'إعلان معتمد ✨',
      badgeColor: 'bg-emerald-400 text-gray-900',
      title: ad.title,
      highlight: 'حلول زراعية متميزة',
      description: ad.description || 'تصفح أحدث عروض الشركات المعتمدة في كروپسا',
      ctaText: 'مشاهدة العرض',
      bgGradient: 'from-[#046A47] via-[#035237] to-[#023E29]',
      icon: <Sparkles className="w-6 h-6 text-amber-300" />,
      imageUrl: ad.desktopImageUrl || ad.mobileImageUrl,
      actionType: 'link',
      actionTarget: ad.link,
    }));

  const allSlides = [...defaultSlides, ...customSlides];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide every 5 seconds unless hovered/interacted
  useEffect(() => {
    if (isPaused || allSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allSlides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, allSlides.length]);

  const current = allSlides[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % allSlides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + allSlides.length) % allSlides.length);
  };

  const handleAction = () => {
    if (current.actionType === 'category' && current.actionTarget && onSelectCategory) {
      onSelectCategory(current.actionTarget);
    } else if (current.actionType === 'installment' && onOpenInstallmentInfo) {
      onOpenInstallmentInfo();
    } else if (current.actionType === 'link' && current.actionTarget) {
      window.open(current.actionTarget, '_blank');
    }
  };

  // 1. Custom Full-Image Banner Mode (configured in Catalog Settings)
  if (settings?.heroBannerMode === 'full_image' && settings.heroBannerUrl) {
    return (
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md my-2 dir-rtl">
        <a
          href={settings.heroBannerLink || '#catalog-products-section'}
          target={settings.heroBannerLink ? '_blank' : undefined}
          rel={settings.heroBannerLink ? 'noopener noreferrer' : undefined}
          className="block w-full"
        >
          <img
            src={settings.heroBannerUrl}
            alt={settings.title || 'بانر المتجر'}
            className="hidden sm:block w-full h-[200px] md:h-[260px] object-cover"
          />
          <img
            src={settings.heroBannerMobileUrl || settings.heroBannerUrl}
            alt={settings.title || 'بانر المتجر'}
            className="sm:hidden w-full h-[155px] object-cover"
          />
        </a>
      </div>
    );
  }

  // 2. Custom Text + Image Banner Mode (configured in Catalog Settings)
  if (settings?.heroBannerMode === 'text_and_image') {
    return (
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md my-2 dir-rtl">
        <div
          className="relative bg-gradient-to-r from-[#046A47] via-[#035A3C] to-[#023E29] text-white p-5 sm:p-8 min-h-[165px] sm:min-h-[210px] flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden"
          style={
            settings.primaryColor
              ? { background: `linear-gradient(to left, ${settings.primaryColor}, #023E29)` }
              : undefined
          }
        >
          <div className="relative z-10 max-w-xl space-y-2 text-center sm:text-right">
            {settings.heroBannerBadge && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-stone-950 text-[10px] sm:text-xs font-black px-3 py-0.5 rounded-full shadow-2xs">
                {settings.heroBannerBadge}
              </span>
            )}
            <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">
              {settings.heroBannerTitle || settings.title}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 font-bold">
              {settings.heroBannerSubtitle || settings.subtitle}
            </p>
            {settings.heroBannerCtaText && (
              <div className="pt-1">
                <a
                  href={settings.heroBannerLink || '#catalog-products-section'}
                  target={settings.heroBannerLink ? '_blank' : undefined}
                  rel={settings.heroBannerLink ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-transform active:scale-95"
                >
                  <span>{settings.heroBannerCtaText}</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {settings.heroBannerUrl && (
            <div className="shrink-0">
              <img
                src={settings.heroBannerUrl}
                alt={settings.heroBannerTitle || 'صورة البانر'}
                className="w-36 h-28 sm:w-48 sm:h-36 rounded-2xl object-cover border-2 border-white/25 shadow-lg"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md my-2 sm:my-4 dir-rtl transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0.4, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.4 }}
          transition={{ duration: 0.25 }}
          className={`relative bg-gradient-to-r ${current.bgGradient} text-white p-4 sm:p-7 min-h-[155px] sm:min-h-[195px] flex items-center justify-between overflow-hidden`}
        >
        {/* Background decorative subtle shapes */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>

        {/* Content Column */}
        <div className="relative z-10 max-w-xl space-y-1.5 sm:space-y-2">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xs inline-flex items-center gap-1 ${current.badgeColor}`}
            >
              {current.badge}
            </span>
            <span className="text-[10px] sm:text-xs text-white/80 font-bold hidden sm:inline-block">
              كروپسا مصر للحلول الزراعية
            </span>
          </div>

          {/* Title & Highlight */}
          <h2 className="text-base sm:text-2xl font-black text-white leading-tight">
            {current.title}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 font-bold line-clamp-1">
            {current.highlight}
          </p>

          {/* Short description */}
          <p className="text-[11px] sm:text-xs text-white/90 line-clamp-1 font-medium hidden xs:block sm:block">
            {current.description}
          </p>

          {/* Action CTA Button */}
          <div className="pt-1">
            <button
              onClick={handleAction}
              className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-[11px] sm:text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <span>{current.ctaText}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Visual / Image Slot */}
        <div className="hidden sm:flex items-center justify-center shrink-0 pl-2">
          {current.imageUrl ? (
            <img
              src={current.imageUrl}
              alt={current.title}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-2 border-white/20 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
              {current.icon}
            </div>
          )}
        </div>

        {/* Next / Prev Controls */}
        <div className="absolute bottom-2.5 left-3 z-20 flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="السابق"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="w-6 h-6 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="التالي"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dots Indicators */}
        <div className="absolute bottom-2.5 right-1/2 translate-x-1/2 z-20 flex items-center gap-1.5">
          {allSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentIndex ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
              title={`شريحة ${idx + 1}`}
            />
          ))}
        </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
