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
}

export const serverSync = {
  /**
   * Fetches latest centralized catalog data across all browsers with zero cache delay
   */
  async fetchFromCentralServer(): Promise<{
    success: boolean;
    data?: ServerCatalogData;
    hasData?: boolean;
    serverTime?: string;
  }> {
    try {
      const res = await fetch(`/api/catalog/data?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) return { success: false };
      const json = await res.json();
      return {
        success: Boolean(json.success),
        data: json.data,
        hasData: Boolean(json.hasData),
        serverTime: json.serverTime,
      };
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
      const res = await fetch('/api/catalog/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialData),
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
