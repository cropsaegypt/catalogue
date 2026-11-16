export interface ServerCatalogData {
  categories?: any[];
  companies?: any[];
  subCategories?: any[];
  products?: any[];
  packages?: any[];
  advertisements?: any[];
  images?: any[];
  pdfDividers?: any[];
  orders?: any[];
  financingRequests?: any[];
  teamMembers?: any[];
  priceHistory?: any[];
  settings?: any;
  lastSyncedAt?: string;
  version?: number;
}

/**
 * Strips huge base64 image strings (> 150KB) from large product payloads so network sync payloads
 * remain lightweight and never exceed Vercel body limits.
 * NOTE: Company logos (logoUrl) are CRITICAL identity assets and are NEVER stripped!
 */
function sanitizeItemForNetworkSync(item: any): any {
  if (!item || typeof item !== 'object') return item;
  if (Array.isArray(item)) {
    return item.map(sanitizeItemForNetworkSync);
  }
  const copy = { ...item };
  // Only strip large gallery images or inline background removals, NEVER logos
  const imageFields = [
    'mainImageUrl',
    'imageUrl',
    'desktopImageUrl',
    'mobileImageUrl',
    'heroBannerImageUrl',
    'heroBannerImageMobileUrl',
    'url',
  ];
  for (const field of imageFields) {
    if (
      typeof copy[field] === 'string' &&
      copy[field].startsWith('data:image/') &&
      copy[field].length > 150000
    ) {
      // Strip oversized inline data URLs during cross-device network sync
      copy[field] = '';
    }
  }
  return copy;
}

function sanitizePayloadForNetworkSync(
  data: Partial<ServerCatalogData>
): Partial<ServerCatalogData> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      sanitized[key] = value.map(sanitizeItemForNetworkSync);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeItemForNetworkSync(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as Partial<ServerCatalogData>;
}

export const serverSync = {
  /**
   * Fetches latest centralized catalog data across all browsers with zero cache delay.
   * If the central server route is empty, it also tries the static snapshot fallback.
   */
  async fetchFromCentralServer(): Promise<{
    success: boolean;
    data?: ServerCatalogData;
    hasData?: boolean;
    serverTime?: string;
    source?: 'api' | 'static-fallback';
  }> {
    try {
      const res = await fetch(`/api/catalog/data?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.hasData && json.data?.products?.length > 0) {
          return {
            success: true,
            data: json.data,
            hasData: true,
            serverTime: json.serverTime,
            source: 'api',
          };
        }
      }

      // Static Snapshot Fallback (serves pre-bundled high-speed CDN snapshot if API is cold or unseeded)
      try {
        const staticRes = await fetch(`/catalog-snapshot.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          if (staticData && Array.isArray(staticData.products) && staticData.products.length > 0) {
            return {
              success: true,
              data: staticData,
              hasData: true,
              serverTime: staticData.lastSyncedAt || new Date().toISOString(),
              source: 'static-fallback',
            };
          }
        }
      } catch {
        // Static fallback optional
      }

      return { success: false, hasData: false };
    } catch (e) {
      console.warn('[Server Sync] Failed to fetch catalog data from central server:', e);
      return { success: false };
    }
  },

  /**
   * Pushes latest updates to the central server so that any other browser or device gets them immediately
   */
  async syncToCentralServer(
    partialData: Partial<ServerCatalogData>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sanitized = sanitizePayloadForNetworkSync(partialData);
      const res = await fetch('/api/catalog/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitized),
      });
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      const json = await res.json();
      return { success: Boolean(json.success), error: json.error };
    } catch (e: any) {
      console.warn('[Server Sync] Failed to post catalog sync to central server:', e);
      return { success: false, error: e?.message };
    }
  },
};
