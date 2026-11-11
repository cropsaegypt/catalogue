/**
 * Pure Canvas edge-seeded background removal utility for extracted catalog bottles/packets.
 * Preserves white bottle labels enclosed by product contours while clearing outer studio/PDF backdrops
 * into transparent PNGs ready for both catalog cards and Canva cream frames.
 */

export interface BackgroundRemovalOptions {
  /** Max output pixel dimension (longest side). Defaults to 480 for fast sync & crisp cards. */
  maxDimension?: number;
  /** Euclidean RGB tolerance from sampled outer backdrop colors. Defaults to 42. */
  tolerance?: number;
  /** Max pixel-to-pixel RGB Manhattan jump allowed while flooding smoothly across backdrop gradients. */
  edgeStepLimit?: number;
}

function loadImageElement(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function resolveReadableImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  // Data URLs or relative same-origin URLs can be read straight onto canvas
  if (src.startsWith('data:') || src.startsWith('/')) {
    try {
      return await loadImageElement(src);
    } catch {
      return null;
    }
  }
  // Remote URLs (e.g. Firebase Storage): try anonymous CORS first, then fetch->blob object URL
  try {
    return await loadImageElement(src, 'anonymous');
  } catch {
    try {
      const resp = await fetch(src, { mode: 'cors' });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      try {
        const img = await loadImageElement(objUrl);
        return img;
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    } catch {
      return null;
    }
  }
}

function runEdgeFloodMask(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tolerance: number,
  edgeStepLimit: number
): { removed: Uint8Array; removedCount: number; bgR: number; bgG: number; bgB: number } {
  const total = w * h;
  const removed = new Uint8Array(total);
  const visited = new Uint8Array(total);

  // Sample outer 2px ring to discover the dominant studio/catalog backdrop color
  const buckets = new Map<number, { count: number; sumR: number; sumG: number; sumB: number }>();
  let transparentPerimeter = 0;
  let totalPerimeter = 0;
  const addSample = (x: number, y: number) => {
    totalPerimeter += 1;
    const idx = (y * w + x) * 4;
    if (data[idx + 3] < 40) {
      transparentPerimeter += 1;
      return;
    }
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const prev = buckets.get(key) || { count: 0, sumR: 0, sumG: 0, sumB: 0 };
    prev.count += 1;
    prev.sumR += r;
    prev.sumG += g;
    prev.sumB += b;
    buckets.set(key, prev);
  };

  for (let x = 0; x < w; x++) {
    addSample(x, 0);
    if (h > 1) addSample(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    addSample(0, y);
    if (w > 1) addSample(w - 1, y);
  }

  // Already has transparent background
  if (totalPerimeter > 0 && transparentPerimeter / totalPerimeter > 0.65) {
    return { removed, removedCount: 0, bgR: 255, bgG: 255, bgB: 255 };
  }

  let bestBucket: { count: number; sumR: number; sumG: number; sumB: number } | null = null;
  for (const b of buckets.values()) {
    if (!bestBucket || b.count > bestBucket.count) {
      bestBucket = b;
    }
  }

  const bgR = bestBucket && bestBucket.count > 0 ? Math.round(bestBucket.sumR / bestBucket.count) : 255;
  const bgG = bestBucket && bestBucket.count > 0 ? Math.round(bestBucket.sumG / bestBucket.count) : 255;
  const bgB = bestBucket && bestBucket.count > 0 ? Math.round(bestBucket.sumB / bestBucket.count) : 255;

  const tolSq = tolerance * tolerance;
  const maxQueue = total;
  const queue = new Int32Array(maxQueue);
  let head = 0;
  let tail = 0;

  const matchesBackdrop = (pixelPos: number): boolean => {
    const i = pixelPos * 4;
    if (data[i + 3] < 25) return true;
    const dr = data[i] - bgR;
    const dg = data[i + 1] - bgG;
    const db = data[i + 2] - bgB;
    return dr * dr + dg * dg + db * db <= tolSq;
  };

  const seed = (x: number, y: number) => {
    const pos = y * w + x;
    if (visited[pos]) return;
    if (matchesBackdrop(pos)) {
      visited[pos] = 1;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    seed(0, y);
    seed(w - 1, y);
  }

  let removedCount = 0;
  const relaxedTolSq = (tolerance + 12) * (tolerance + 12);

  while (head < tail) {
    const pos = queue[head++];
    if (!removed[pos]) {
      removed[pos] = 1;
      removedCount++;
    }

    const x = pos % w;
    const y = (pos - x) / w;
    const curI = pos * 4;
    const cr = data[curI];
    const cg = data[curI + 1];
    const cb = data[curI + 2];

    const neighbors: number[] = [];
    if (x > 0) neighbors.push(pos - 1);
    if (x < w - 1) neighbors.push(pos + 1);
    if (y > 0) neighbors.push(pos - w);
    if (y < h - 1) neighbors.push(pos + w);

    for (let k = 0; k < neighbors.length; k++) {
      const nPos = neighbors[k];
      if (visited[nPos]) continue;
      const ni = nPos * 4;
      if (data[ni + 3] < 25) {
        visited[nPos] = 1;
        queue[tail++] = nPos;
        continue;
      }

      const nr = data[ni];
      const ng = data[ni + 1];
      const nb = data[ni + 2];
      const drBg = nr - bgR;
      const dgBg = ng - bgG;
      const dbBg = nb - bgB;
      const bgDistSq = drBg * drBg + dgBg * dgBg + dbBg * dbBg;
      const stepDiff = Math.abs(nr - cr) + Math.abs(ng - cg) + Math.abs(nb - cb);

      if (bgDistSq <= relaxedTolSq && stepDiff <= edgeStepLimit) {
        visited[nPos] = 1;
        queue[tail++] = nPos;
      }
    }
  }

  return { removed, removedCount, bgR, bgG, bgB };
}

/**
 * Removes uniform studio/catalog background from a product image using edge-seeded BFS
 * with anti-aliased edge feathering and tight crop trimming, returning a transparent PNG data URL.
 * Returns null if the image cannot be read (e.g. blocked CORS) or has no safely removable backdrop.
 */
export async function removeProductBackground(
  imageSrc: string,
  options: BackgroundRemovalOptions = {}
): Promise<string | null> {
  if (!imageSrc || imageSrc.startsWith('data:image/svg+xml')) return null;

  const maxDimension = options.maxDimension ?? 480;
  const baseTolerance = options.tolerance ?? 42;
  const baseStepLimit = options.edgeStepLimit ?? 36;

  const img = await resolveReadableImage(imageSrc);
  if (!img) return null;

  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  if (!natW || !natH) return null;

  const scale = Math.min(1, maxDimension / Math.max(natW, natH));
  const w = Math.max(24, Math.round(natW * scale));
  const h = Math.max(24, Math.round(natH * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }

  const data = imgData.data;
  const total = w * h;

  let pass = runEdgeFloodMask(data, w, h, baseTolerance, baseStepLimit);
  let removedRatio = pass.removedCount / total;

  // If the first pass bled too aggressively (e.g. light bottle near white edge), tighten strictly
  if (removedRatio > 0.88) {
    pass = runEdgeFloodMask(data, w, h, Math.round(baseTolerance * 0.55), Math.round(baseStepLimit * 0.65));
    removedRatio = pass.removedCount / total;
  }

  // Do not corrupt images with no uniform edge backdrop or severe bleed-through
  if (removedRatio < 0.03 || removedRatio > 0.90) {
    return null;
  }

  const { removed, bgR, bgG, bgB } = pass;

  // Apply clean transparency + 1px anti-aliased edge feathering to remove gray fringes
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pos = y * w + x;
      const i = pos * 4;
      if (removed[pos]) {
        data[i + 3] = 0;
        continue;
      }

      const touchesRemoved =
        (x > 0 && removed[pos - 1]) ||
        (x < w - 1 && removed[pos + 1]) ||
        (y > 0 && removed[pos - w]) ||
        (y < h - 1 && removed[pos + w]);

      if (touchesRemoved && data[i + 3] > 20) {
        const dist = Math.hypot(data[i] - bgR, data[i + 1] - bgG, data[i + 2] - bgB);
        if (dist < baseTolerance + 22) {
          const factor = Math.max(0.28, Math.min(1, dist / (baseTolerance + 22)));
          data[i + 3] = Math.round(data[i + 3] * factor);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Tight-crop to remaining opaque product pixels with balanced 4% padding
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 22) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null;

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const pad = Math.max(6, Math.round(Math.max(cropW, cropH) * 0.04));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW + pad * 2;
  outCanvas.height = cropH + pad * 2;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return null;

  outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
  outCtx.drawImage(workCanvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);
  return outCanvas.toDataURL('image/png');
}
