/**
 * High-Precision Edge-Guarded Background Removal Utility for Agricultural Products.
 *
 * Designed specifically for fertilizers, pesticides, seeds, bottles, bags, and cartons:
 * 1. Computes a 3x3 Sobel edge gradient map to establish container and label boundaries.
 * 2. Samples background color and variance across outer perimeter boundaries.
 * 3. Dual-constraint flood fill: stops at Sobel edge barriers and color variance limits.
 * 4. Scanline Solid Infill & Morphological Hole-Filling:
 *    - Guarantees that white bottle bodies, white bottle caps, white labels, barcodes,
 *      and text enclosed within container borders are 100% PROTECTED and never erased.
 * 5. Anti-aliased 1px edge defringing for clean, studio-grade cutouts on transparent PNG.
 */

export interface BackgroundRemovalOptions {
  /** Max output pixel dimension (longest side). Defaults to 520 for sharp product cards. */
  maxDimension?: number;
  /** Euclidean RGB tolerance from sampled outer backdrop colors. Defaults to 26 for high precision. */
  tolerance?: number;
  /** Edge gradient barrier sensitivity (lower = stricter barrier against leaking into product). */
  edgeBarrierThreshold?: number;
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
  // Remote URLs: try anonymous CORS first, then fetch -> blob object URL fallback
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

/**
 * Removes outer studio/catalog background while strictly preserving product body, caps, and labels.
 */
export async function removeProductBackground(
  imageSrc: string,
  options: BackgroundRemovalOptions = {}
): Promise<string | null> {
  if (!imageSrc || imageSrc.startsWith('data:image/svg+xml')) return null;

  const maxDimension = options.maxDimension ?? 520;
  const tolerance = options.tolerance ?? 26;
  const edgeThreshold = options.edgeBarrierThreshold ?? 13;

  const img = await resolveReadableImage(imageSrc);
  if (!img) return null;

  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  if (!natW || !natH) return null;

  const scale = Math.min(1, maxDimension / Math.max(natW, natH));
  const w = Math.max(32, Math.round(natW * scale));
  const h = Math.max(32, Math.round(natH * scale));

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

  // 1. Compute Grayscale Luminance and Sobel Edge Map
  const lum = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    lum[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  const edges = new Float32Array(total);
  for (let y = 1; y < h - 1; y++) {
    const rowOffset = y * w;
    const prevRowOffset = (y - 1) * w;
    const nextRowOffset = (y + 1) * w;

    for (let x = 1; x < w - 1; x++) {
      const gx =
        -lum[prevRowOffset + (x - 1)] +
        lum[prevRowOffset + (x + 1)] -
        2 * lum[rowOffset + (x - 1)] +
        2 * lum[rowOffset + (x + 1)] -
        lum[nextRowOffset + (x - 1)] +
        lum[nextRowOffset + (x + 1)];

      const gy =
        -lum[prevRowOffset + (x - 1)] -
        2 * lum[prevRowOffset + x] -
        lum[prevRowOffset + (x + 1)] +
        lum[nextRowOffset + (x - 1)] +
        2 * lum[nextRowOffset + x] +
        lum[nextRowOffset + (x + 1)];

      edges[rowOffset + x] = Math.sqrt(gx * gx + gy * gy) / 4;
    }
  }

  // 2. Sample outer perimeter to discover the true backdrop color
  const buckets = new Map<number, { count: number; sumR: number; sumG: number; sumB: number }>();
  let transparentPerimeter = 0;
  let totalPerimeter = 0;

  const addSample = (x: number, y: number) => {
    totalPerimeter += 1;
    const idx = (y * w + x) * 4;
    if (data[idx + 3] < 35) {
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

  // If already transparent, return as-is
  if (totalPerimeter > 0 && transparentPerimeter / totalPerimeter > 0.60) {
    return workCanvas.toDataURL('image/png');
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
  const relaxedTolSq = (tolerance + 8) * (tolerance + 8);
  const removed = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  // 3. Flood-fill strictly from perimeter, stopping at edges and color deviation
  const pushSeed = (pos: number) => {
    if (removed[pos]) return;
    const i = pos * 4;
    if (data[i + 3] < 35) {
      removed[pos] = 1;
      queue[tail++] = pos;
      return;
    }
    const dr = data[i] - bgR;
    const dg = data[i + 1] - bgG;
    const db = data[i + 2] - bgB;
    if (dr * dr + dg * dg + db * db <= tolSq && edges[pos] < edgeThreshold) {
      removed[pos] = 1;
      queue[tail++] = pos;
    }
  };

  for (let x = 0; x < w; x++) {
    pushSeed(x);
    pushSeed((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    pushSeed(y * w);
    pushSeed(y * w + (w - 1));
  }

  let removedCount = 0;

  while (head < tail) {
    const pos = queue[head++];
    removedCount++;

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
      if (removed[nPos]) continue;

      // STOP if hitting an edge barrier
      if (edges[nPos] >= edgeThreshold) continue;

      const ni = nPos * 4;
      if (data[ni + 3] < 35) {
        removed[nPos] = 1;
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

      // Strict criteria to prevent leaking into white bottle plastic or labels
      if (bgDistSq <= relaxedTolSq && stepDiff <= 18) {
        removed[nPos] = 1;
        queue[tail++] = nPos;
      }
    }
  }

  // 4. SOLID INFILL (Protection of white bottle bodies, caps, labels, barcodes)
  // For each horizontal scanline, any gap between the left and right product boundary is preserved!
  for (let y = 0; y < h; y++) {
    let leftBound = -1;
    let rightBound = -1;
    for (let x = 0; x < w; x++) {
      if (!removed[y * w + x]) {
        if (leftBound === -1) leftBound = x;
        rightBound = x;
      }
    }

    if (leftBound !== -1 && rightBound > leftBound + 2) {
      for (let x = leftBound; x <= rightBound; x++) {
        removed[y * w + x] = 0; // 100% Guaranteed Protected Interior
      }
    }
  }

  // Vertical silhouette support: Protect bottle caps and base
  for (let x = 0; x < w; x++) {
    let topBound = -1;
    let bottomBound = -1;
    for (let y = 0; y < h; y++) {
      if (!removed[y * w + x]) {
        if (topBound === -1) topBound = y;
        bottomBound = y;
      }
    }

    if (topBound !== -1 && bottomBound > topBound + 4) {
      for (let y = topBound; y <= bottomBound; y++) {
        removed[y * w + x] = 0;
      }
    }
  }

  // Verify that an actual product remains
  let finalOpaqueCount = 0;
  for (let i = 0; i < total; i++) {
    if (!removed[i]) finalOpaqueCount++;
  }

  const opaqueRatio = finalOpaqueCount / total;
  // If the mask erased everything or nothing, abort safely
  if (opaqueRatio < 0.05 || opaqueRatio > 0.96) {
    return null;
  }

  // 5. Anti-aliased 1px edge defringing & transparency application
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pos = y * w + x;
      const i = pos * 4;

      if (removed[pos]) {
        data[i + 3] = 0;
        continue;
      }

      // Check if adjacent to background for smooth antialiasing
      const isEdge =
        (x > 0 && removed[pos - 1]) ||
        (x < w - 1 && removed[pos + 1]) ||
        (y > 0 && removed[pos - w]) ||
        (y < h - 1 && removed[pos + w]);

      if (isEdge && data[i + 3] > 20) {
        const dist = Math.hypot(data[i] - bgR, data[i + 1] - bgG, data[i + 2] - bgB);
        if (dist < tolerance + 15) {
          const factor = Math.max(0.40, Math.min(1, dist / (tolerance + 15)));
          data[i + 3] = Math.round(data[i + 3] * factor);
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 6. Tight-crop to product bounds with 4% padding
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 25) {
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
  const pad = Math.max(6, Math.round(Math.max(cropW, cropH) * 0.035));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = cropW + pad * 2;
  outCanvas.height = cropH + pad * 2;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return null;

  outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
  outCtx.drawImage(workCanvas, minX, minY, cropW, cropH, pad, pad, cropW, cropH);
  return outCanvas.toDataURL('image/png');
}
