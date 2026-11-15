import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, ChevronLeft, Percent, ShieldCheck, Truck, CreditCard, ArrowLeft } from 'lucide-react';
import { Advertisement, CatalogSettings } from '../../types';
import {
  parseBannerUrlWithSettings,
  getBannerPositionStyle,
} from '../../utils/bannerHelper';

interface OffersBannerCarouselProps {
  advertisements?: Advertisement[];
  settings?: CatalogSettings;
  onSelectCategory?: (catId: string) => void;
  onOpenInstallmentInfo?: () => void;
}

interface BannerSlide {
  id: string;
  badge?: string;
  badgeColor?: string;
  title?: string;
  highlight?: string;
  description?: string;
  ctaText?: string;
  bgGradient?: string;
  icon?: React.ReactNode;
  imageUrl?: string;
  mobileImageUrl?: string;
  actionType: 'category' | 'installment' | 'filter' | 'link';
  actionTarget?: string;
}

export const OffersBannerCarousel: React.FC<OffersBannerCarouselProps> = ({
  advertisements = [],
  settings,
  onSelectCategory,
  onOpenInstallmentInfo,
}) => {
  // Built-in high-converting agricultural offer banners (shown when no custom slides exist)
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

  // 1. Primary Banner Slide (from Settings heroBannerUrl) - Included as Slide #1
  const heroSlide: BannerSlide | null = settings?.heroBannerUrl
    ? {
        id: 'hero-banner-primary',
        badge: settings.heroBannerBadge || 'عرض مميز 🔥',
        badgeColor: 'bg-amber-400 text-stone-950',
        title: settings.heroBannerTitle || '',
        highlight: '',
        description: settings.heroBannerSubtitle || '',
        ctaText: settings.heroBannerCtaText || '',
        bgGradient: 'from-[#046A47] via-[#035A3C] to-[#023E29]',
        imageUrl: settings.heroBannerUrl,
        mobileImageUrl: settings.heroBannerMobileUrl || settings.heroBannerUrl,
        actionType: 'link',
        actionTarget: settings.heroBannerLink || '#catalog-products-section',
      }
    : null;

  // 2. Custom Advertisement Slides
  const adSlides: BannerSlide[] = advertisements
    .filter((ad) => ad.active && ad.showOnline !== false)
    .map((ad, idx) => ({
      id: ad.id || `ad-${idx}`,
      badge: 'إعلان معتمد ✨',
      badgeColor: 'bg-emerald-400 text-gray-950',
      title: ad.title || '',
      highlight: '',
      description: ad.description || '',
      ctaText: 'مشاهدة العرض',
      bgGradient: 'from-[#046A47] via-[#035237] to-[#023E29]',
      icon: <Sparkles className="w-6 h-6 text-amber-300" />,
      imageUrl: ad.desktopImageUrl || ad.mobileImageUrl,
      mobileImageUrl: ad.mobileImageUrl || ad.desktopImageUrl,
      actionType: 'link',
      actionTarget: ad.link || '#catalog-products-section',
    }));

  // Build unified slides list: Hero Banner first, followed by all additional advertisement slides.
  // Neither hides the other - both rotate together seamlessly in the unified slider.
  const userSlides: BannerSlide[] = [];
  if (heroSlide) {
    userSlides.push(heroSlide);
  }
  userSlides.push(...adSlides);

  // If user has uploaded any custom banners/ads, use them; otherwise show default agricultural promos.
  const slides = userSlides.length > 0 ? userSlides : defaultSlides;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Keep index within bounds if slide count changes
  const activeIndex = currentIndex >= slides.length ? 0 : currentIndex;
  const current = slides[activeIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-play timer: flip slide every 4.5 seconds unless hovered or interacted
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, slides.length, handleNext]);

  const handleAction = () => {
    if (!current) return;
    if (current.actionType === 'category' && current.actionTarget && onSelectCategory) {
      onSelectCategory(current.actionTarget);
    } else if (current.actionType === 'installment' && onOpenInstallmentInfo) {
      onOpenInstallmentInfo();
    } else if (current.actionTarget) {
      if (current.actionTarget.startsWith('#')) {
        const targetElement = document.querySelector(current.actionTarget);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        window.open(current.actionTarget, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!current) return null;

  // Determine if slide has an image
  const hasImage = Boolean(current.imageUrl);
  const desktopImgConfig = hasImage ? parseBannerUrlWithSettings(current.imageUrl) : null;
  const mobileImgConfig = hasImage
    ? parseBannerUrlWithSettings(current.mobileImageUrl || current.imageUrl)
    : null;

  // Determine if slide has text overlay (title, description, or badge)
  const hasTextOverlay = Boolean(
    (current.title && current.title.trim() && current.title !== 'بانر إعلاني') ||
    (current.description && current.description.trim()) ||
    current.badge
  );

  return (
    <div
      className="relative w-full h-[155px] xs:h-[185px] sm:h-[235px] md:h-[285px] lg:h-[320px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md my-2 sm:my-4 dir-rtl select-none bg-stone-900 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0.35, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0.35 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full h-full relative cursor-pointer"
          onClick={handleAction}
        >
          {/* A. Image-Based Banner Slide */}
          {hasImage && desktopImgConfig && mobileImgConfig ? (
            <div className="relative w-full h-full">
              {/* Full-Bleed Fixed-Size Responsive Image */}
              <img
                src={desktopImgConfig.url}
                alt={current.title || 'بانر المتجر'}
                className={`hidden sm:block w-full h-full ${
                  desktopImgConfig.fit === 'contain' ? 'object-contain' : 'object-cover'
                }`}
                style={{ objectPosition: getBannerPositionStyle(desktopImgConfig.position) }}
                loading="lazy"
              />
              <img
                src={mobileImgConfig.url || desktopImgConfig.url}
                alt={current.title || 'بانر المتجر'}
                className={`sm:hidden w-full h-full ${
                  mobileImgConfig.fit === 'contain' ? 'object-contain' : 'object-cover'
                }`}
                style={{ objectPosition: getBannerPositionStyle(mobileImgConfig.position) }}
                loading="lazy"
              />

              {/* Optional Text Overlay (rendered cleanly if title/description provided) */}
              {hasTextOverlay && (
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-stone-950/85 via-stone-950/40 to-transparent flex items-center p-4 sm:p-8 pointer-events-none">
                  <div className="max-w-xl space-y-1.5 sm:space-y-2 pointer-events-auto">
                    {current.badge && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs ${
                          current.badgeColor || 'bg-amber-400 text-stone-950'
                        }`}
                      >
                        {current.badge}
                      </span>
                    )}

                    {current.title && current.title !== 'بانر إعلاني' && (
                      <h2 className="text-base sm:text-2xl font-black text-white leading-tight drop-shadow-sm">
                        {current.title}
                      </h2>
                    )}

                    {current.description && (
                      <p className="text-xs sm:text-sm text-stone-200 font-bold line-clamp-2 drop-shadow-xs max-w-md">
                        {current.description}
                      </p>
                    )}

                    {current.ctaText && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction();
                          }}
                          className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-[11px] sm:text-xs px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <span>{current.ctaText}</span>
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* B. Built-in Gradient Promo Slide (Fallback when no image is uploaded) */
            <div
              className={`w-full h-full bg-gradient-to-r ${current.bgGradient || 'from-[#046A47] via-[#035A3C] to-[#023E29]'} text-white p-5 sm:p-8 flex items-center justify-between overflow-hidden relative`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

              <div className="relative z-10 max-w-xl space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xs inline-flex items-center gap-1 ${
                      current.badgeColor || 'bg-amber-400 text-stone-950'
                    }`}
                  >
                    {current.badge}
                  </span>
                  <span className="text-[10px] sm:text-xs text-white/80 font-bold hidden sm:inline-block">
                    كروپسا مصر للحلول الزراعية
                  </span>
                </div>

                <h2 className="text-base sm:text-2xl font-black text-white leading-tight">
                  {current.title}
                </h2>
                {current.highlight && (
                  <p className="text-xs sm:text-sm text-amber-200 font-bold line-clamp-1">
                    {current.highlight}
                  </p>
                )}
                {current.description && (
                  <p className="text-[11px] sm:text-xs text-white/90 line-clamp-2 font-medium max-w-md hidden xs:block">
                    {current.description}
                  </p>
                )}

                {current.ctaText && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction();
                      }}
                      className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-[11px] sm:text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      <span>{current.ctaText}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center justify-center shrink-0 pl-4">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                  {current.icon || <Sparkles className="w-8 h-8 text-amber-300" />}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls: Next / Prev Arrows (Shown when more than 1 slide) */}
      {slides.length > 1 && (
        <>
          {/* Next Button (in RTL, next arrow moves to left) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute top-1/2 -translate-y-1/2 left-2.5 sm:left-4 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer shadow-md opacity-85 hover:opacity-100 active:scale-90"
            title="الشريحة التالية"
            aria-label="الشريحة التالية"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Prev Button (in RTL, prev arrow moves to right) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute top-1/2 -translate-y-1/2 right-2.5 sm:right-4 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-sm flex items-center justify-center transition-all cursor-pointer shadow-md opacity-85 hover:opacity-100 active:scale-90"
            title="الشريحة السابقة"
            aria-label="الشريحة السابقة"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bottom Dots Navigation Indicators */}
          <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === activeIndex
                    ? 'w-6 bg-amber-400'
                    : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                title={`الانتقال إلى الشريحة ${idx + 1}`}
                aria-label={`الانتقال إلى الشريحة ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
