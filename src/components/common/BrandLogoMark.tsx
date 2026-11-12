import React, { useEffect, useState } from 'react';

interface BrandLogoMarkProps {
  logoUrl?: string;
  alt?: string;
  /** Layout & size classes shared by both image container and fallback badge. */
  sizeClassName?: string;
  /** Background/border classes used when displaying the fallback emblem. */
  fallbackClassName?: string;
  /** Optional custom classes applied when rendering the uploaded logo image. */
  imageWrapperClassName?: string;
  imgClassName?: string;
  fallbackText?: string;
}

/** Displays the configured brand logo image with a clean fallback badge when unset or broken. */
export const BrandLogoMark: React.FC<BrandLogoMarkProps> = ({
  logoUrl,
  alt = 'CROPSA Logo',
  sizeClassName = 'w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl',
  fallbackClassName = 'bg-gradient-to-br from-[#046A47] to-[#024A31] text-white font-black text-lg sm:text-xl shadow-xs',
  imageWrapperClassName = 'bg-white border border-stone-200/80 p-0.5 shadow-xs',
  imgClassName = 'w-full h-full object-contain rounded-lg',
  fallbackText = '🌱',
}) => {
  const cleanUrl = (logoUrl || '').trim();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [cleanUrl]);

  if (!cleanUrl || hasError) {
    return (
      <div
        className={`${sizeClassName} ${fallbackClassName} flex items-center justify-center shrink-0 transition-all`}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClassName} ${imageWrapperClassName} flex items-center justify-center shrink-0 overflow-hidden transition-all`}
    >
      <img
        src={cleanUrl}
        alt={alt}
        onError={() => setHasError(true)}
        className={imgClassName}
      />
    </div>
  );
};
