import GIF from 'gif.js';
import gifWorkerUrl from 'gif.js/dist/gif.worker.js?url';
import { saveAs } from 'file-saver';
import { getBlob } from '../../../lib/db';
import type { Card } from '../../../types/card';

interface Options {
  maxEdge?: number; // default 720
  delayMs?: number; // per frame, default 900
  onProgress?: (ratio: number) => void;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

export async function exportGif(card: Card, opts: Options = {}): Promise<void> {
  const maxEdge = opts.maxEdge ?? 720;
  const delay = opts.delayMs ?? 900;

  const frames: HTMLCanvasElement[] = [];
  let targetW = 0;
  let targetH = 0;

  for (const pid of card.pageOrder) {
    const page = card.pages[pid];
    if (!page) continue;
    const blob = await getBlob(page.blobKey);
    if (!blob) continue;
    const img = await blobToImage(blob);
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(2, Math.round(img.naturalWidth * scale));
    const h = Math.max(2, Math.round(img.naturalHeight * scale));
    if (!targetW || !targetH) {
      targetW = w;
      targetH = h;
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    // Fit image inside target canvas preserving aspect
    const s = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
    frames.push(canvas);
    URL.revokeObjectURL(img.src);
  }

  if (!frames.length) return;

  await new Promise<void>((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: targetW,
      height: targetH,
      workerScript: gifWorkerUrl,
      transparent: null,
    });
    for (const f of frames) gif.addFrame(f, { delay });
    gif.on('progress', (p: number) => opts.onProgress?.(p));
    gif.on('finished', (blob: Blob) => {
      const filename =
        (card.metadata.title || 'card').replace(/[^a-z0-9-_ ]/gi, '') || 'card';
      saveAs(blob, `${filename}.gif`);
      resolve();
    });
    gif.on('abort', () => reject(new Error('GIF render aborted')));
    gif.render();
  });
}
