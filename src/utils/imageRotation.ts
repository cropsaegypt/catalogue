import { aiCatalogService } from '../services/aiCatalogService';

/**
 * Loads an image safely handling CORS, blobs, and DataURLs so Canvas is never tainted.
 */
async function loadReadableImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;

  // Data URLs or relative same-origin URLs
  if (src.startsWith('data:') || src.startsWith('/')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Remote URLs: Try anonymous crossOrigin
  const imgWithCors = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  if (imgWithCors) return imgWithCors;

  // Fallback: fetch blob then create object URL
  try {
    const resp = await fetch(src, { mode: 'cors' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const objUrl = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
      img.src = objUrl;
    });
  } catch {
    return null;
  }
}

/**
 * Rotates or flips an image (URL or dataUrl) by specified degrees (90, 180, 270, or -90).
 * Uses HTML5 Canvas with high quality smoothing.
 */
export async function rotateImage(
  imageSrc: string,
  degrees: 90 | 180 | 270 | -90 = 90
): Promise<string> {
  if (!imageSrc) return imageSrc;

  try {
    const img = await loadReadableImage(imageSrc);
    if (!img) return imageSrc;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageSrc;

    const normalizedDeg = ((degrees % 360) + 360) % 360;
    const isQuarterTurn = normalizedDeg === 90 || normalizedDeg === 270;

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;

    canvas.width = isQuarterTurn ? srcH : srcW;
    canvas.height = isQuarterTurn ? srcW : srcH;

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normalizedDeg * Math.PI) / 180);
    ctx.drawImage(img, -srcW / 2, -srcH / 2);

    // Keep PNG transparency if original is png/webp
    const isPng =
      imageSrc.startsWith('data:image/png') ||
      imageSrc.startsWith('data:image/webp') ||
      imageSrc.toLowerCase().endsWith('.png');

    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    const quality = isPng ? undefined : 0.92;

    return canvas.toDataURL(mimeType, quality);
  } catch (err) {
    console.warn('[ImageRotation] Failed rotating on canvas:', err);
    return imageSrc;
  }
}

/**
 * Rotates an image and uploads the rotated version to persistent storage (Firebase/Server)
 */
export async function rotateAndUploadImage(
  imageSrc: string,
  degrees: 90 | 180 | 270 | -90 = 90,
  prefix = 'rotated-prod'
): Promise<string> {
  if (!imageSrc) return imageSrc;
  const rotatedDataUrl = await rotateImage(imageSrc, degrees);
  if (!rotatedDataUrl || !rotatedDataUrl.startsWith('data:image/')) {
    return rotatedDataUrl;
  }
  const uploaded = await aiCatalogService.uploadExtractedImage(rotatedDataUrl, prefix);
  return uploaded || rotatedDataUrl;
}
