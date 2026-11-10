// Curated high-resolution professional agricultural product images
// matching common Egyptian / MENA fertilizer, pesticide, and biostimulant packaging

export interface AgriculturalImageOption {
  id: string;
  name: string;
  category: string;
  url: string;
}

export const AGRICULTURAL_PRESET_IMAGES: AgriculturalImageOption[] = [
  {
    id: 'agri-potassium',
    name: 'عبوة سماد بوتاسي / بايوستيمولانت 1 لتر',
    category: 'nutrients',
    url: 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'agri-foliar',
    name: 'عبوة أسمدة ورقية وعناصر مخلبية',
    category: 'foliar',
    url: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'agri-amino',
    name: 'محلول أحماض أمينية ومحفزات جذور',
    category: 'growth',
    url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'agri-bio',
    name: 'مخصب حيوي عالي التركيز',
    category: 'nutrients',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23a81?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'agri-stimulant',
    name: 'منشط نمو ومثبت تزهير',
    category: 'growth',
    url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'agri-npk',
    name: 'مركب NPK متوازن ومحسن تربة',
    category: 'foliar',
    url: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'agri-canister',
    name: 'جركن تسميد أرضي 5 لتر / 20 لتر',
    category: 'nutrients',
    url: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'agri-spray',
    name: 'مركب وقائي ومعالج نقص عناصر',
    category: 'pesticide',
    url: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&auto=format&fit=crop&q=80',
  },
];

/**
 * Returns a suitable default agricultural product image based on product name or category
 */
export function getAgriculturalProductImage(
  productName?: string,
  categoryName?: string,
  fallbackLogo?: string
): string {
  const combined = `${productName || ''} ${categoryName || ''}`.toLowerCase();

  if (combined.includes('بوتاس') || combined.includes('potass') || combined.includes('k2o')) {
    return AGRICULTURAL_PRESET_IMAGES[0].url;
  }
  if (combined.includes('ورق') || combined.includes('مخلب') || combined.includes('عناصر') || combined.includes('foliar')) {
    return AGRICULTURAL_PRESET_IMAGES[1].url;
  }
  if (combined.includes('أمين') || combined.includes('amino') || combined.includes('جذور') || combined.includes('root')) {
    return AGRICULTURAL_PRESET_IMAGES[2].url;
  }
  if (combined.includes('نمو') || combined.includes('تزهير') || combined.includes('عقد') || combined.includes('growth')) {
    return AGRICULTURAL_PRESET_IMAGES[4].url;
  }
  if (combined.includes('فوسفور') || combined.includes('نيتروجين') || combined.includes('npk')) {
    return AGRICULTURAL_PRESET_IMAGES[5].url;
  }
  if (combined.includes('جركن') || combined.includes('5 لتر') || combined.includes('20 لتر')) {
    return AGRICULTURAL_PRESET_IMAGES[6].url;
  }
  if (combined.includes('وقائ') || combined.includes('فطر') || combined.includes('حشر')) {
    return AGRICULTURAL_PRESET_IMAGES[7].url;
  }

  // Pick deterministic default by string length to keep variety
  const idx = Math.abs((productName || '').length % AGRICULTURAL_PRESET_IMAGES.length);
  return AGRICULTURAL_PRESET_IMAGES[idx].url || fallbackLogo || AGRICULTURAL_PRESET_IMAGES[0].url;
}
