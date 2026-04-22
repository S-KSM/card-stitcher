// Main-thread client for cv-worker.ts. Singleton worker, promise-based API.
// Using Vite's `?worker` suffix routes through the worker plugin, which
// bundles the worker to IIFE in both dev and prod (matches `worker.format`
// in vite.config.ts). Without this, dev served the raw TS with a trailing
// `export {}` that a classic worker can't parse.
import CvWorker from './cv-worker.ts?worker';
import type { Point, Quad } from './types';

interface DetectResult {
  quad: Quad | null;
  coveragePct: number;
  frameSize: { width: number; height: number };
}

interface WarpResult {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    console.log('[cv-client] spawning worker');
    worker = new CvWorker();
    worker.addEventListener('message', (e: MessageEvent) => {
      console.log('[cv-client] msg from worker', e.data);
      const { id, ok, result, error } = e.data as {
        id: number;
        ok: boolean;
        result?: unknown;
        error?: string;
      };
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (ok) p.resolve(result);
      else p.reject(new Error(error ?? 'cv-worker error'));
    });
    worker.addEventListener('error', (e) => {
      console.error('[cv-client] worker error', e.message, e.filename, e.lineno, e);
      pending.forEach((p) => p.reject(new Error(e.message || 'cv-worker crashed')));
      pending.clear();
      worker = null;
    });
    worker.addEventListener('messageerror', (e) => {
      console.error('[cv-client] worker messageerror', e);
    });
  }
  return worker;
}

function post<T>(msg: Record<string, unknown>, transfer: Transferable[]): Promise<T> {
  const w = getWorker();
  const id = nextId;
  nextId += 1;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    console.log('[cv-client] posting', { id, ...msg });
    w.postMessage({ id, ...msg }, transfer);
  });
}

export async function workerDetectQuad(bitmap: ImageBitmap): Promise<DetectResult> {
  return post<DetectResult>({ type: 'detect', bitmap }, [bitmap]);
}

export async function workerWarp(
  bitmap: ImageBitmap,
  quad: Quad,
  format: 'png' | 'jpeg',
  maxEdge: number,
): Promise<WarpResult> {
  return post<WarpResult>({ type: 'warp', bitmap, quad, format, maxEdge }, [bitmap]);
}

// Convenience: turn an ImageBitmap into a Blob on the main thread.
export async function bitmapToBlob(
  bitmap: ImageBitmap,
  format: 'png' | 'jpeg',
  quality?: number,
): Promise<Blob> {
  const oc = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = oc.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  return oc.convertToBlob({ type: mime, quality });
}

export type { Point, Quad, DetectResult, WarpResult };
