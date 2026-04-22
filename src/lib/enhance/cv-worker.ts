/// <reference lib="webworker" />
// Classic Web Worker — loads OpenCV.js via importScripts from CDN.
// The module-worker + dynamic import approach hung during opencv init.

declare const self: DedicatedWorkerGlobalScope & { cv?: CVNamespace; Module?: unknown };

/* eslint-disable no-restricted-globals */

// --- opencv types (minimal) ---
type Point = { x: number; y: number };
type Quad = [Point, Point, Point, Point];

interface CVSizeCtor { new (w: number, h: number): { width: number; height: number }; }
interface CVMat {
  rows: number;
  cols: number;
  data: Uint8Array;
  data32S: Int32Array;
  delete(): void;
}
interface CVMatVector {
  size(): number;
  get(i: number): CVMat;
  delete(): void;
}
interface CVNamespace {
  imread: (canvas: OffscreenCanvas | ImageData) => CVMat;
  imshow: (canvas: OffscreenCanvas, mat: CVMat) => void;
  matFromImageData: (img: ImageData) => CVMat;
  matFromArray: (r: number, c: number, t: number, d: ArrayLike<number>) => CVMat;
  Mat: new () => CVMat;
  MatVector: new () => CVMatVector;
  Size: CVSizeCtor;
  CV_32FC2: number;
  COLOR_RGBA2GRAY: number;
  MORPH_RECT: number;
  MORPH_CLOSE: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  getStructuringElement: (s: number, sz: { width: number; height: number }) => CVMat;
  cvtColor: (s: CVMat, d: CVMat, c: number) => void;
  bilateralFilter: (s: CVMat, d: CVMat, k: number, sc: number, ss: number) => void;
  Canny: (s: CVMat, d: CVMat, t1: number, t2: number) => void;
  morphologyEx: (s: CVMat, d: CVMat, op: number, k: CVMat) => void;
  findContours: (s: CVMat, c: CVMatVector, h: CVMat, m: number, me: number) => void;
  arcLength: (c: CVMat, closed: boolean) => number;
  approxPolyDP: (c: CVMat, a: CVMat, e: number, closed: boolean) => void;
  isContourConvex: (c: CVMat) => boolean;
  contourArea: (m: CVMat) => number;
  getPerspectiveTransform: (s: CVMat, d: CVMat) => CVMat;
  warpPerspective: (s: CVMat, d: CVMat, M: CVMat, sz: { width: number; height: number }) => void;
  onRuntimeInitialized?: () => void;
  getBuildInformation?: () => string;
}

console.log('[cv-worker] module loaded');

self.addEventListener('error', (e) => {
  console.error('[cv-worker] uncaught error', e.message, e.filename, e.lineno, e.error);
});
self.addEventListener('unhandledrejection', (e) => {
  console.error('[cv-worker] unhandled rejection', e.reason);
});

// Official OpenCV.js build — classic (non-MODULARIZE) emscripten, auto-inits
// and exposes `cv` as a factory-or-namespace on self.
const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js';

// NOTE: cannot return the cv namespace from an async function — OpenCV.js
// attaches a `then` method to the namespace (emscripten Module.ready pattern),
// making it a thenable that hijacks Promise resolution. Store it in a module
// variable and expose synchronously instead.
let cvRef: CVNamespace | null = null;
let cvInitPromise: Promise<void> | null = null;

async function ensureCV(): Promise<void> {
  if (cvRef) return;
  if (!cvInitPromise) {
    cvInitPromise = (async () => {
      let resolveReady: () => void = () => {};
      const readyPromise = new Promise<void>((r) => {
        resolveReady = r;
      });
      (self as unknown as { Module: unknown }).Module = {
        onRuntimeInitialized() {
          console.log('[cv-worker] Module.onRuntimeInitialized fired');
          resolveReady();
        },
      };

      console.log('[cv-worker] importScripts opencv from CDN');
      (self as unknown as { importScripts: (u: string) => void }).importScripts(OPENCV_URL);
      console.log(
        '[cv-worker] importScripts returned, self.cv typeof =',
        typeof self.cv,
      );

      const rawCv = self.cv as unknown;

      // Poll for cvtColor as a fallback ready signal.
      const polling = (async () => {
        const start = Date.now();
        while (
          typeof (rawCv as { cvtColor?: unknown }).cvtColor !== 'function' &&
          Date.now() - start < 30_000
        ) {
          await new Promise((r) => setTimeout(r, 50));
        }
      })();

      console.log('[cv-worker] waiting for init');
      await Promise.race([readyPromise, polling]);
      console.log('[cv-worker] init wait done');

      const ns = self.cv as CVNamespace;
      if (typeof ns.cvtColor !== 'function') {
        throw new Error('OpenCV loaded but cv.cvtColor never available');
      }
      // Strip the `then` method so future async returns of this object don't hang.
      try {
        delete (ns as unknown as { then?: unknown }).then;
      } catch {
        /* ignore */
      }
      cvRef = ns;
      console.log('[cv-worker] opencv ready, cvRef set');
    })();
    cvInitPromise.catch((err) => console.error('[cv-worker] ensureCV rejected', err));
  }
  await cvInitPromise;
}

function cv(): CVNamespace {
  if (!cvRef) throw new Error('cv not loaded — call ensureCV first');
  return cvRef;
}

// --- geometry helpers ---
function orderCorners(pts: Point[]): Quad {
  const sum = pts.map((p) => p.x + p.y);
  const diff = pts.map((p) => p.y - p.x);
  const tl = pts[sum.indexOf(Math.min(...sum))];
  const br = pts[sum.indexOf(Math.max(...sum))];
  const tr = pts[diff.indexOf(Math.min(...diff))];
  const bl = pts[diff.indexOf(Math.max(...diff))];
  return [tl, tr, br, bl];
}
function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function targetDimensions(q: Quad): { width: number; height: number } {
  const width = Math.max(dist(q[0], q[1]), dist(q[3], q[2]));
  const height = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  return { width: Math.round(width), height: Math.round(height) };
}
function scaleQuad(q: Quad, sx: number, sy: number): Quad {
  return q.map((p) => ({ x: p.x * sx, y: p.y * sy })) as Quad;
}

function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const oc = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = oc.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

function downscaleImageData(src: ImageData, w: number, h: number): ImageData {
  const a = new OffscreenCanvas(src.width, src.height);
  a.getContext('2d')!.putImageData(src, 0, 0);
  const b = new OffscreenCanvas(w, h);
  const ctx = b.getContext('2d')!;
  ctx.drawImage(a, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

const DETECT_LONG_EDGE = 1024;
const MIN_COVERAGE = 0.5;

async function detectQuadFromImageData(src: ImageData): Promise<{
  quad: Quad | null;
  coveragePct: number;
  frameSize: { width: number; height: number };
}> {
  await ensureCV();
  const cvNs = cv();
  console.log('[cv-worker] detect: back from ensureCV');
  const scale = Math.min(1, DETECT_LONG_EDGE / Math.max(src.width, src.height));
  const dw = Math.max(1, Math.round(src.width * scale));
  const dh = Math.max(1, Math.round(src.height * scale));
  const detectImg = scale < 1 ? downscaleImageData(src, dw, dh) : src;
  console.log('[cv-worker] detect: detectImg', detectImg.width, 'x', detectImg.height);

  const srcMat = cvNs.matFromImageData(detectImg);
  const gray = new cvNs.Mat();
  const filtered = new cvNs.Mat();
  const edges = new cvNs.Mat();
  const closed = new cvNs.Mat();
  const kernel = cvNs.getStructuringElement(cvNs.MORPH_RECT, new cvNs.Size(5, 5));
  const contours = new cvNs.MatVector();
  const hierarchy = new cvNs.Mat();
  const approx = new cvNs.Mat();

  const cleanup = () => {
    srcMat.delete();
    gray.delete();
    filtered.delete();
    edges.delete();
    closed.delete();
    kernel.delete();
    contours.delete();
    hierarchy.delete();
    approx.delete();
  };

  try {
    cvNs.cvtColor(srcMat, gray, cvNs.COLOR_RGBA2GRAY);
    cvNs.bilateralFilter(gray, filtered, 9, 75, 75);
    cvNs.Canny(filtered, edges, 75, 200);
    cvNs.morphologyEx(edges, closed, cvNs.MORPH_CLOSE, kernel);
    cvNs.findContours(closed, contours, hierarchy, cvNs.RETR_EXTERNAL, cvNs.CHAIN_APPROX_SIMPLE);

    const frameArea = detectImg.width * detectImg.height;
    const candidates: { pts: Point[]; area: number }[] = [];
    for (let i = 0; i < contours.size(); i += 1) {
      const c = contours.get(i);
      const perim = cvNs.arcLength(c, true);
      cvNs.approxPolyDP(c, approx, 0.02 * perim, true);
      if (approx.rows === 4) {
        const pts: Point[] = [];
        for (let p = 0; p < 4; p += 1) {
          pts.push({ x: approx.data32S[p * 2], y: approx.data32S[p * 2 + 1] });
        }
        const data = new Float32Array(8);
        pts.forEach((pt, idx) => {
          data[idx * 2] = pt.x;
          data[idx * 2 + 1] = pt.y;
        });
        const matForArea = cvNs.matFromArray(4, 1, cvNs.CV_32FC2, Array.from(data));
        const area = cvNs.contourArea(matForArea);
        matForArea.delete();
        candidates.push({ pts, area });
      }
      c.delete();
    }
    if (!candidates.length) {
      return { quad: null, coveragePct: 0, frameSize: { width: src.width, height: src.height } };
    }
    candidates.sort((a, b) => b.area - a.area);
    const best = candidates[0];
    const coveragePct = best.area / frameArea;
    if (coveragePct < MIN_COVERAGE) {
      return { quad: null, coveragePct, frameSize: { width: src.width, height: src.height } };
    }
    const ordered = orderCorners(best.pts);
    const upQuad = scaleQuad(ordered, src.width / detectImg.width, src.height / detectImg.height);
    return { quad: upQuad, coveragePct, frameSize: { width: src.width, height: src.height } };
  } finally {
    cleanup();
  }
}

interface WarpOptions {
  format: 'png' | 'jpeg';
  maxEdge: number;
}

async function warpImageData(
  src: ImageData,
  quad: Quad,
  opts: WarpOptions,
): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  await ensureCV();
  const cvNs = cv();
  const srcMat = cvNs.matFromImageData(src);
  const dst = new cvNs.Mat();
  const srcTri = cvNs.matFromArray(4, 1, cvNs.CV_32FC2, [
    quad[0].x, quad[0].y,
    quad[1].x, quad[1].y,
    quad[2].x, quad[2].y,
    quad[3].x, quad[3].y,
  ]);
  let { width: tw, height: th } = targetDimensions(quad);
  const longEdge = Math.max(tw, th);
  if (longEdge > opts.maxEdge) {
    const s = opts.maxEdge / longEdge;
    tw = Math.max(1, Math.round(tw * s));
    th = Math.max(1, Math.round(th * s));
  }
  const dstTri = cvNs.matFromArray(4, 1, cvNs.CV_32FC2, [
    0, 0,
    tw - 1, 0,
    tw - 1, th - 1,
    0, th - 1,
  ]);
  const M = cvNs.getPerspectiveTransform(srcTri, dstTri);
  cvNs.warpPerspective(srcMat, dst, M, new cvNs.Size(tw, th));

  // cv.imshow references HTMLCanvasElement which doesn't exist in a worker —
  // copy dst Mat bytes into an ImageData and putImageData on the OffscreenCanvas.
  const outCanvas = new OffscreenCanvas(tw, th);
  const outCtx = outCanvas.getContext('2d')!;
  const rgba = new Uint8ClampedArray(dst.data.buffer, dst.data.byteOffset, dst.data.byteLength).slice();
  const imageData = new ImageData(rgba, dst.cols, dst.rows);
  outCtx.putImageData(imageData, 0, 0);
  const bitmap = outCanvas.transferToImageBitmap();

  srcMat.delete();
  dst.delete();
  M.delete();
  srcTri.delete();
  dstTri.delete();

  return { bitmap, width: tw, height: th };
}

interface DetectReq { id: number; type: 'detect'; bitmap: ImageBitmap; }
interface WarpReq {
  id: number;
  type: 'warp';
  bitmap: ImageBitmap;
  quad: Quad;
  format: 'png' | 'jpeg';
  maxEdge: number;
}
type Req = DetectReq | WarpReq;

self.addEventListener('message', async (e: MessageEvent<Req>) => {
  const msg = e.data;
  console.log('[cv-worker] got msg', msg.type, 'id', msg.id);
  try {
    if (msg.type === 'detect') {
      const img = bitmapToImageData(msg.bitmap);
      msg.bitmap.close?.();
      console.log('[cv-worker] detect: imageData', img.width, 'x', img.height);
      const result = await detectQuadFromImageData(img);
      console.log('[cv-worker] detect done', result);
      self.postMessage({ id: msg.id, ok: true, result });
    } else if (msg.type === 'warp') {
      const img = bitmapToImageData(msg.bitmap);
      msg.bitmap.close?.();
      console.log('[cv-worker] warp: imageData', img.width, 'x', img.height);
      const { bitmap, width, height } = await warpImageData(img, msg.quad, {
        format: msg.format,
        maxEdge: msg.maxEdge,
      });
      console.log('[cv-worker] warp done', width, 'x', height);
      self.postMessage(
        { id: msg.id, ok: true, result: { bitmap, width, height } },
        { transfer: [bitmap] },
      );
    }
  } catch (err) {
    console.error('[cv-worker] handler error', err);
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id: msg.id, ok: false, error: message });
  }
});

export {};
