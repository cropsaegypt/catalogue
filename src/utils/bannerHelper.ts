export interface BannerImageSettings {
  url: string;
  position: 'center' | 'top' | 'bottom' | string;
  height: 'compact' | 'standard' | 'tall' | 'auto';
  fit: 'cover' | 'contain';
}

/**
 * Parses image URL and extracts encoded focal position, height, and fit from fragment hash.
 * e.g. "https://domain.com/banner.jpg#pos=top&h=tall&fit=cover"
 */
export function parseBannerUrlWithSettings(rawUrl?: string): BannerImageSettings {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { url: '', position: 'center', height: 'standard', fit: 'cover' };
  }

  const hashIdx = rawUrl.indexOf('#');
  if (hashIdx === -1) {
    return { url: rawUrl, position: 'center', height: 'standard', fit: 'cover' };
  }

  const url = rawUrl.substring(0, hashIdx);
  const hashString = rawUrl.substring(hashIdx + 1);
  const params = new URLSearchParams(hashString);

  const position = params.get('pos') || 'center';
  const height = (params.get('h') as any) || 'standard';
  const fit = (params.get('fit') as any) || 'cover';

  return { url, position, height, fit };
}

/**
 * Encodes focal position, height, and fit into URL fragment hash.
 */
export function createBannerUrlWithSettings(settings: BannerImageSettings): string {
  if (!settings.url) return '';
  const cleanUrl = settings.url.split('#')[0];
  const params = new URLSearchParams();

  if (settings.position && settings.position !== 'center') {
    params.set('pos', settings.position);
  }
  if (settings.height && settings.height !== 'standard') {
    params.set('h', settings.height);
  }
  if (settings.fit && settings.fit !== 'cover') {
    params.set('fit', settings.fit);
  }

  const query = params.toString();
  return query ? `${cleanUrl}#${query}` : cleanUrl;
}

/**
 * Returns Tailwind height classes for the banner image container.
 */
export function getBannerHeightClass(height: string = 'standard', isMobile = false): string {
  switch (height) {
    case 'compact':
      return isMobile ? 'h-[140px]' : 'h-[175px] md:h-[200px]';
    case 'tall':
      return isMobile ? 'h-[220px]' : 'h-[280px] md:h-[350px]';
    case 'auto':
      return 'h-auto max-h-[480px]';
    case 'standard':
    default:
      return isMobile ? 'h-[165px]' : 'h-[210px] md:h-[260px]';
  }
}

/**
 * Returns the CSS object-position string.
 */
export function getBannerPositionStyle(pos: string = 'center'): string {
  if (!pos || pos === 'center') return 'center center';
  if (pos === 'top') return 'center top';
  if (pos === 'bottom') return 'center bottom';
  if (pos.endsWith('%')) return `center ${pos}`;
  return pos;
}
