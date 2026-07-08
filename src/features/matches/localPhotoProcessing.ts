// Local-only photo processing for share cards (section 06).
//
// Photos chosen here NEVER leave the device: the file is decoded, downscaled and
// re-encoded to a JPEG blob in the browser, exposed as an object URL for the card
// preview/export, and released with releaseLocalCardPhoto(). Re-encoding through a
// canvas also strips EXIF (including GPS) automatically.

export type ProcessedCardPhoto = {
  // Data URL for <img src>. A data URL (not a blob: URL) is required so the
  // html-to-image exporter — which appends a cache-bust query string to image
  // srcs — can inline the photo (a blob: URL breaks when a query is appended).
  dataUrl: string;
  width: number;
  height: number;
  // Average luminance (0..1) of the bottom third of the image, used to pick an
  // adaptive scrim: brighter bottoms need a stronger scrim so stats stay readable.
  bottomLuminance: number;
};

// 2048 supaya crop 9:16 dari foto landscape/portrait masih ≥1080px lebar saat
// dipakai full-bleed di slide Rewind 1080×1920.
const MAX_SIDE = 2048;
const TARGET_MAX_BYTES = 1_200_000;
const MIN_QUALITY = 0.5;

const drawToCanvas = (
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): { canvas: HTMLCanvasElement; width: number; height: number } => {
  const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to prepare image canvas.');
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, width, height };
};

const sampleBottomLuminance = (canvas: HTMLCanvasElement): number => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0.5;
  const regionHeight = Math.max(1, Math.round(canvas.height / 3));
  const regionTop = canvas.height - regionHeight;
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, regionTop, canvas.width, regionHeight).data;
  } catch {
    return 0.5;
  }
  let total = 0;
  let count = 0;
  // Sample a coarse grid to keep this cheap on large canvases.
  const step = 4 * 8;
  for (let index = 0; index < data.length; index += step) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    // Rec. 601 luma.
    total += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    count += 1;
  }
  return count > 0 ? total / count : 0.5;
};

// Approximate decoded byte size of a base64 data URL (base64 is ~4/3 of bytes).
const estimateDataUrlBytes = (dataUrl: string) => Math.floor((dataUrl.length * 3) / 4);

const canvasToJpegDataUrl = (canvas: HTMLCanvasElement): string => {
  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (estimateDataUrlBytes(dataUrl) > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
};

const loadViaImageElement = (file: File): Promise<ProcessedCardPhoto> => (
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      try {
        const { canvas, width, height } = drawToCanvas(image, image.naturalWidth, image.naturalHeight);
        const bottomLuminance = sampleBottomLuminance(canvas);
        const dataUrl = canvasToJpegDataUrl(canvas);
        URL.revokeObjectURL(objectUrl);
        resolve({ dataUrl, width, height, bottomLuminance });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Selected file is not a readable image.'));
    };
    image.src = objectUrl;
  })
);

/**
 * Process a user-selected image into a downscaled, EXIF-stripped JPEG object URL
 * for use as a share-card background. Nothing is uploaded or persisted.
 */
export const processLocalCardPhoto = async (file: File): Promise<ProcessedCardPhoto> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  // Prefer createImageBitmap for correct EXIF orientation handling when available.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      try {
        const { canvas, width, height } = drawToCanvas(bitmap, bitmap.width, bitmap.height);
        const bottomLuminance = sampleBottomLuminance(canvas);
        const dataUrl = canvasToJpegDataUrl(canvas);
        return { dataUrl, width, height, bottomLuminance };
      } finally {
        bitmap.close();
      }
    } catch {
      // Fall through to the <img> element path (e.g. Safari without option support).
    }
  }
  return loadViaImageElement(file);
};

/**
 * Adaptive scrim opacity (0..1) for the bottom gradient of a photo card.
 * Brighter photo bottoms get a heavier scrim so overlaid stats stay legible.
 */
export const getAdaptiveScrimOpacity = (bottomLuminance: number): number => {
  // Map luminance 0..1 to scrim 0.62..0.9 (never fully transparent).
  const clamped = Math.min(1, Math.max(0, bottomLuminance));
  return Math.round((0.62 + clamped * 0.28) * 100) / 100;
};
