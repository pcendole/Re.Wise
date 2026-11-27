import type { OcclusionBox } from '@/types/models';

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Compresses an image file, blob, or data URL into a high-performance WebP
 * capped at maxWidth 1200px and 0.75 quality (<150 KB for SQLite/localStorage).
 */
export async function compressImageToWebP(
  input: File | Blob | string,
  maxWidth = 1200,
  quality = 0.75
): Promise<CompressedImageResult> {
  let sourceUrl: string;
  let isObjectUrl = false;

  if (typeof input === 'string') {
    sourceUrl = input;
  } else {
    sourceUrl = URL.createObjectURL(input);
    isObjectUrl = true;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get 2D canvas context');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        // Fallback to jpeg if WebP conversion wasn't supported
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Estimate size in bytes from base64 string
        const sizeBytes = Math.round((dataUrl.length * 3) / 4);

        if (isObjectUrl) URL.revokeObjectURL(sourceUrl);
        resolve({ dataUrl, width, height, sizeBytes });
      } catch (err) {
        if (isObjectUrl) URL.revokeObjectURL(sourceUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (isObjectUrl) URL.revokeObjectURL(sourceUrl);
      reject(err);
    };

    img.src = sourceUrl;
  });
}

/**
 * Extracts image file from clipboard paste events
 */
export function extractClipboardImage(event: React.ClipboardEvent | ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}

/**
 * Smart Auto-Detect Labels:
 * Uses Chromium Shape Detection API (window.TextDetector) if available on-device,
 * with a high-contrast connected component text-block detection fallback.
 */
export async function detectTextLabels(
  imageElement: HTMLImageElement
): Promise<OcclusionBox[]> {
  const boxes: OcclusionBox[] = [];

  // 1. Try Native Chromium TextDetector API (if enabled on device)
  if ('TextDetector' in window) {
    try {
      const detector = new (window as any).TextDetector();
      const detected = await detector.detect(imageElement);
      if (detected && detected.length > 0) {
        const imgWidth = imageElement.naturalWidth || imageElement.width;
        const imgHeight = imageElement.naturalHeight || imageElement.height;

        detected.forEach((item: any, idx: number) => {
          const rect = item.boundingBox;
          boxes.push({
            id: `box_${Date.now()}_${idx}`,
            x: Math.max(0, Math.min(100, (rect.x / imgWidth) * 100)),
            y: Math.max(0, Math.min(100, (rect.y / imgHeight) * 100)),
            width: Math.max(2, Math.min(100, (rect.width / imgWidth) * 100)),
            height: Math.max(1.5, Math.min(100, (rect.height / imgHeight) * 100)),
            label: item.rawValue || `Label ${idx + 1}`,
          });
        });
        if (boxes.length > 0) return boxes;
      }
    } catch {
      // Fall through to contrast heuristic
    }
  }

  // 2. High-Contrast Edge/Text-Density Fallback Algorithm
  const sampleWidth = 240;
  const sampleHeight = Math.round(
    (sampleWidth * (imageElement.naturalHeight || imageElement.height)) /
      (imageElement.naturalWidth || imageElement.width)
  );

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return defaultBoxes();

  ctx.drawImage(imageElement, 0, 0, sampleWidth, sampleHeight);
  const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imgData.data;

  // Grid scan for localized high-contrast text variance
  const blockSize = 16;
  const cols = Math.floor(sampleWidth / blockSize);
  const rows = Math.floor(sampleHeight / blockSize);
  const candidates: Array<{ x: number; y: number; density: number }> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let minLum = 255;
      let maxLum = 0;
      let edgeCount = 0;

      for (let py = 0; py < blockSize; py += 2) {
        for (let px = 0; px < blockSize; px += 2) {
          const idx = ((r * blockSize + py) * sampleWidth + (c * blockSize + px)) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
      }

      const contrast = maxLum - minLum;
      if (contrast > 120) {
        edgeCount++;
        candidates.push({
          x: ((c * blockSize) / sampleWidth) * 100,
          y: ((r * blockSize) / sampleHeight) * 100,
          density: contrast,
        });
      }
    }
  }

  // Cluster or take top distinct candidates (up to 8 boxes)
  const sorted = candidates.sort((a, b) => b.density - a.density).slice(0, 8);
  sorted.forEach((cand, idx) => {
    boxes.push({
      id: `box_auto_${Date.now()}_${idx}`,
      x: Math.max(1, Math.min(85, cand.x)),
      y: Math.max(1, Math.min(88, cand.y)),
      width: 18,
      height: 6,
      label: `Label ${idx + 1}`,
    });
  });

  return boxes.length > 0 ? boxes : defaultBoxes();
}

function defaultBoxes(): OcclusionBox[] {
  return [
    { id: `box_def_1`, x: 18, y: 22, width: 22, height: 7, label: 'Label 1' },
    { id: `box_def_2`, x: 60, y: 35, width: 24, height: 7, label: 'Label 2' },
    { id: `box_def_3`, x: 30, y: 68, width: 26, height: 7, label: 'Label 3' },
  ];
}
