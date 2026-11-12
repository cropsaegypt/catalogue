/**
 * Ensures any inline base64 data:image/... URL stays well under Firestore's 1 MiB document limit
 * and lightweight for browser storage, converting oversized PNG/JPEG images into compact WebP
 * while preserving transparent backgrounds (alpha channel) cleanly.
 */

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  return Math.ceil(((dataUrl.length - commaIdx - 1) * 3) / 4);
}

export async function ensureFirestoreSafeImageUrl(
  url: string | undefined,
  maxBytes = 280_000
): Promise<string | undefined> {
  if (!url || !url.startsWith('data:image/')) {
    return url;
  }

  // SVGs and already-compact data URLs need no conversion
  if (url.startsWith('data:image/svg+xml') || estimateDataUrlBytes(url) <= maxBytes) {
    return url;
  }

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return url;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const dimensions = [900, 720, 560, 420];
        const qualities = [0.84, 0.72, 0.58, 0.45];

        let bestResult = url;

        for (const maxDim of dimensions) {
          const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
          const w = Math.max(1, Math.round((img.width || maxDim) * scale));
          const h = Math.max(1, Math.round((img.height || maxDim) * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          for (const q of qualities) {
            // WebP preserves alpha transparency while typically staying 5x-10x smaller than PNG
            const candidate = canvas.toDataURL('image/webp', q);
            bestResult = candidate;
            if (estimateDataUrlBytes(candidate) <= maxBytes) {
              resolve(candidate);
              return;
            }
          }
        }

        resolve(bestResult);
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export async function compressProductsForStorage<
  T extends { mainImageUrl?: string; galleryImageIds?: string[] },
>(items: T[]): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const safeMain = await ensureFirestoreSafeImageUrl(item.mainImageUrl);
      const safeGallery =
        item.galleryImageIds && item.galleryImageIds.length > 0
          ? await Promise.all(
              item.galleryImageIds.map(async (g) => (await ensureFirestoreSafeImageUrl(g)) || g)
            )
          : item.galleryImageIds;

      if (safeMain === item.mainImageUrl && safeGallery === item.galleryImageIds) {
        return item;
      }
      return {
        ...item,
        mainImageUrl: safeMain,
        galleryImageIds: safeGallery,
      };
    })
  );
}
