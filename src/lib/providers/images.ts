import { getBlob } from '../db';
import type { PageAsset } from '../../types/card';

export const MAX_VISION_PAGES = 4;

export type VisionMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export interface LoadedImage {
  base64: string;
  dataUrl: string;
  mime: VisionMime;
}

function toVisionMime(mime: string): VisionMime {
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/gif') return 'image/gif';
  if (mime === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function loadVisionImages(
  pages: Record<string, PageAsset>,
  pageOrder: string[],
): Promise<LoadedImage[]> {
  const out: LoadedImage[] = [];
  const take = Math.min(MAX_VISION_PAGES, pageOrder.length);
  for (let i = 0; i < take; i += 1) {
    const page = pages[pageOrder[i]];
    if (!page) continue;
    const blob = await getBlob(page.blobKey);
    if (!blob) continue;
    const base64 = await blobToBase64(blob);
    const mime = toVisionMime(page.mime);
    out.push({ base64, mime, dataUrl: `data:${mime};base64,${base64}` });
  }
  return out;
}
