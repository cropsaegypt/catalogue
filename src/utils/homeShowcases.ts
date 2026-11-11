import {
  CatalogSettings,
  HomeShowcaseItem,
  HomeShowcaseKey,
  HomeShowcaseSection,
  Product,
} from '../types';

export const HOME_SHOWCASE_ORDER: HomeShowcaseKey[] = ['latest', 'merchant_deals', 'seasonal'];

export const HOME_SHOWCASE_DEFAULTS: Record<
  HomeShowcaseKey,
  { title: string; subtitle: string; badgeText: string }
> = {
  latest: {
    title: 'أحدث المنتجات',
    subtitle: 'أحدث المركبات والمخصبات المضافة حديثاً للكتالوج',
    badgeText: 'وصل حديثاً',
  },
  merchant_deals: {
    title: 'عروض التجار',
    subtitle: 'خصومات وأسعار خاصة لتجار الجملة والتوزيع',
    badgeText: 'خصم خاص للتجار',
  },
  seasonal: {
    title: 'منتجات الموسم',
    subtitle: 'التركيبات الأكثر طلباً للموسم الزراعي الحالي',
    badgeText: 'منتجات الموسم',
  },
};

function buildAutoFallbackItems(key: HomeShowcaseKey, products: Product[]): HomeShowcaseItem[] {
  const active = products.filter((p) => p.active);
  if (active.length === 0) return [];

  let chosen: Product[] = [];
  if (key === 'latest') {
    chosen = [...active]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 4);
  } else if (key === 'merchant_deals') {
    const featured = active.filter((p) => p.featured || p.displayOrder <= 6);
    chosen = (featured.length > 0 ? featured : active).slice(0, 4);
  } else {
    const rotated = active.length > 4 ? [...active.slice(4), ...active.slice(0, 4)] : active;
    chosen = rotated.slice(0, 4);
  }

  return chosen.map((p, idx) => ({
    id: `AUTO-${key}-${p.id}-${idx}`,
    productId: p.id,
  }));
}

/**
 * Resolves the 3 homepage showcase boxes ('latest', 'merchant_deals', 'seasonal') cleanly,
 * using admin-curated products/discounts when customized or smart automatic picks initially.
 */
export function resolveHomeShowcases(
  settings: CatalogSettings,
  products: Product[]
): HomeShowcaseSection[] {
  const saved = settings.homeShowcases || {};

  return HOME_SHOWCASE_ORDER.map((key) => {
    const meta = HOME_SHOWCASE_DEFAULTS[key];
    const custom = saved[key];

    if (custom) {
      const items =
        custom.customized || (custom.items && custom.items.length > 0)
          ? custom.items
          : buildAutoFallbackItems(key, products);

      return {
        key,
        title: custom.title || meta.title,
        subtitle: custom.subtitle ?? meta.subtitle,
        badgeText: custom.badgeText ?? meta.badgeText,
        enabled: custom.enabled !== false,
        customized: custom.customized,
        items,
      };
    }

    return {
      key,
      title: meta.title,
      subtitle: meta.subtitle,
      badgeText: meta.badgeText,
      enabled: true,
      customized: false,
      items: buildAutoFallbackItems(key, products),
    };
  });
}

export function computeShowcasePricing(
  basePrice: number,
  item: HomeShowcaseItem
): {
  originalPrice: number;
  finalPrice: number;
  discountPercent: number;
  hasDiscount: boolean;
  badgeLabel: string;
} {
  const pct = Math.max(0, Math.min(95, Number(item.discountPercent) || 0));
  const originalPrice = Number(basePrice) || 0;
  const finalPrice = pct > 0 ? Math.round(originalPrice * (1 - pct / 100)) : originalPrice;
  const customLabel = (item.discountLabel || '').trim();
  const badgeLabel =
    customLabel || (pct > 0 ? `خصم ${pct}%` : '');

  return {
    originalPrice,
    finalPrice,
    discountPercent: pct,
    hasDiscount: pct > 0 || Boolean(customLabel),
    badgeLabel,
  };
}
