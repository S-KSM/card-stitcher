const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.88;

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  mime: string;
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width: w, height: h } = bitmap;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(bitmap, 0, 0, tw, th);
  bitmap.close?.();

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      mime,
      JPEG_QUALITY,
    );
  });

  return { blob, width: tw, height: th, mime };
}

const objectUrlCache = new Map<string, string>();

export function blobUrl(key: string, blob: Blob): string {
  const existing = objectUrlCache.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(key, url);
  return url;
}

export function revokeBlobUrl(key: string): void {
  const url = objectUrlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(key);
  }
}

export function revokeAllBlobUrls(): void {
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
  objectUrlCache.clear();
}

export function uid(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}
