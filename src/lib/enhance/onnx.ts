// ONNX (silueta) background-removal enhance. OpenCV ops run in cv-worker;
// ORT inference runs via env.wasm.proxy (its own worker). The main thread
// only does light canvas work and chunked mask compositing.
import type { PageAsset } from '../../types/card';
import { getBlob, putBlob } from '../db';
import { uid } from '../imageUtils';
import { classicalBackend } from './classical';
import { workerWarp } from './cv-client';
import { scaleQuad } from './geometry';
import type {
  EnhanceBackend,
  EnhanceMeta,
  EnhanceOptions,
  EnhanceResult,
  Quad,
} from './types';

const MODEL_ID = 'silueta';
// rembg releases host silueta.onnx as a public GitHub release asset (CORS-enabled).
const MODEL_URL =
  'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx';
const ORT_CDN_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/ort.mjs';
const MODEL_CACHE = 'cs-enhance-models-v1';
const INPUT_SIZE = 320;
const DEFAULT_MAX_EDGE = 2048;
const WORK_MAX_EDGE = 2048;

interface OrtTensor {
  data: Float32Array;
}
interface OrtInferenceSession {
  inputNames: string[];
  outputNames: string[];
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}
interface OrtRuntime {
  env: {
    wasm: {
      wasmPaths: string;
      proxy?: boolean;
      numThreads?: number;
      simd?: boolean;
    };
  };
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor;
  InferenceSession: {
    create(
      buffer: ArrayBuffer,
      options: { executionProviders: string[] },
    ): Promise<OrtInferenceSession>;
  };
}

let ortPromise: Promise<OrtRuntime> | null = null;
let sessionPromise: Promise<OrtInferenceSession> | null = null;

const yieldToBrowser = () =>
  new Promise<void>((r) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => r());
    else setTimeout(r, 0);
  });

async function loadOrt(): Promise<OrtRuntime> {
  if (!ortPromise) {
    ortPromise = (async () => {
      const mod = (await import(/* @vite-ignore */ ORT_CDN_URL)) as unknown as OrtRuntime;
      mod.env.wasm.wasmPaths =
        'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/';
      mod.env.wasm.proxy = true;
      mod.env.wasm.numThreads = 1;
      mod.env.wasm.simd = true;
      return mod;
    })();
  }
  return ortPromise;
}

async function fetchModelBuffer(): Promise<ArrayBuffer> {
  if ('caches' in window) {
    const cache = await caches.open(MODEL_CACHE);
    const cached = await cache.match(MODEL_URL);
    if (cached) return await cached.arrayBuffer();
    const resp = await fetch(MODEL_URL);
    if (!resp.ok || !resp.body) throw new Error(`Model fetch failed: ${resp.status}`);
    const buf = await resp.arrayBuffer();
    await cache.put(MODEL_URL, new Response(buf));
    return buf;
  }
  const resp = await fetch(MODEL_URL);
  return resp.arrayBuffer();
}

async function getSession(): Promise<OrtInferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await loadOrt();
      const buffer = await fetchModelBuffer();
      const providers: string[] = [];
      if ('gpu' in navigator) providers.push('webgpu');
      providers.push('wasm');
      return ort.InferenceSession.create(buffer, { executionProviders: providers });
    })();
  }
  return sessionPromise;
}

async function loadBitmap(
  source: PageAsset,
  maxEdge?: number,
): Promise<{ bitmap: ImageBitmap; scale: number }> {
  const blob = await getBlob(source.blobKey);
  if (!blob) throw new Error('Source blob missing');
  const probe = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const longEdge = Math.max(probe.width, probe.height);
  if (maxEdge && longEdge > maxEdge) {
    const scale = maxEdge / longEdge;
    const w = Math.round(probe.width * scale);
    const h = Math.round(probe.height * scale);
    probe.close?.();
    const bitmap = await createImageBitmap(blob, {
      imageOrientation: 'from-image',
      resizeWidth: w,
      resizeHeight: h,
      resizeQuality: 'high',
    });
    return { bitmap, scale };
  }
  return { bitmap: probe, scale: 1 };
}

function preprocessForSilueta(rgba: ImageData): Float32Array {
  const size = INPUT_SIZE;
  const out = new Float32Array(3 * size * size);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const r = rgba.data[i] / 255;
      const g = rgba.data[i + 1] / 255;
      const b = rgba.data[i + 2] / 255;
      const idx = y * size + x;
      out[idx] = (r - mean[0]) / std[0];
      out[size * size + idx] = (g - mean[1]) / std[1];
      out[2 * size * size + idx] = (b - mean[2]) / std[2];
    }
  }
  return out;
}

async function runPipeline(source: PageAsset, opts: EnhanceOptions): Promise<EnhanceResult> {
  const t0 = performance.now();
  const outputFormat = opts.outputFormat ?? 'png';
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;

  const { bitmap, scale: sourceScale } = await loadBitmap(source, WORK_MAX_EDGE);

  let quadWork: Quad | null = null;
  let quadSource: Quad | null = null;
  let coveragePct = 0;
  let quadAuto = false;

  if (opts.quadOverride) {
    quadSource = opts.quadOverride;
    quadWork = sourceScale === 1
      ? opts.quadOverride
      : scaleQuad(opts.quadOverride, sourceScale, sourceScale);
    coveragePct = 1;
  } else {
    const detection = await classicalBackend.detectQuad(source);
    quadSource = detection.quad;
    coveragePct = detection.coveragePct;
    quadAuto = true;
    if (detection.quad) {
      quadWork = sourceScale === 1
        ? detection.quad
        : scaleQuad(detection.quad, sourceScale, sourceScale);
    }
  }

  if (!quadWork || !quadSource) {
    bitmap.close?.();
    const meta: EnhanceMeta = {
      backend: 'onnx',
      quad: [
        { x: 0, y: 0 },
        { x: bitmap.width / sourceScale, y: 0 },
        { x: bitmap.width / sourceScale, y: bitmap.height / sourceScale },
        { x: 0, y: bitmap.height / sourceScale },
      ],
      quadAuto: true,
      coveragePct,
      modelId: MODEL_ID,
      tookMs: performance.now() - t0,
      createdAt: Date.now(),
    };
    return {
      page: source,
      meta,
      success: false,
      fallbackReason: coveragePct > 0 ? 'low-coverage' : 'no-quad',
    };
  }

  // Warp via worker (OpenCV off main thread)
  const warped = await workerWarp(bitmap, quadWork, outputFormat, maxEdge);
  await yieldToBrowser();

  // Resize warped to INPUT_SIZE for silueta (main thread, cheap at 320x320)
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = INPUT_SIZE;
  smallCanvas.height = INPUT_SIZE;
  const smallCtx = smallCanvas.getContext('2d')!;
  smallCtx.drawImage(warped.bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const smallImg = smallCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  const ort = await loadOrt();
  const tensor = new ort.Tensor('float32', preprocessForSilueta(smallImg), [
    1,
    3,
    INPUT_SIZE,
    INPUT_SIZE,
  ]);
  const session = await getSession();
  await yieldToBrowser();
  const output = await session.run({ [session.inputNames[0]]: tensor });
  const maskData = output[session.outputNames[0]].data;
  await yieldToBrowser();

  // Build 320x320 mask canvas
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = INPUT_SIZE;
  maskCanvas.height = INPUT_SIZE;
  const maskCtx = maskCanvas.getContext('2d')!;
  const maskImg = maskCtx.createImageData(INPUT_SIZE, INPUT_SIZE);
  let minV = Infinity;
  let maxV = -Infinity;
  for (let i = 0; i < maskData.length; i += 1) {
    if (maskData[i] < minV) minV = maskData[i];
    if (maskData[i] > maxV) maxV = maskData[i];
  }
  const range = maxV - minV || 1;
  for (let i = 0; i < maskData.length; i += 1) {
    const v = Math.round(((maskData[i] - minV) / range) * 255);
    const j = i * 4;
    maskImg.data[j] = v;
    maskImg.data[j + 1] = v;
    maskImg.data[j + 2] = v;
    maskImg.data[j + 3] = 255;
  }
  maskCtx.putImageData(maskImg, 0, 0);

  // Upscale mask to warped size + composite onto warped bitmap
  const W = warped.width;
  const H = warped.height;
  const fullMask = document.createElement('canvas');
  fullMask.width = W;
  fullMask.height = H;
  fullMask.getContext('2d')!.drawImage(maskCanvas, 0, 0, W, H);
  const fullMaskData = fullMask.getContext('2d')!.getImageData(0, 0, W, H);
  await yieldToBrowser();

  const warpedCanvas = document.createElement('canvas');
  warpedCanvas.width = W;
  warpedCanvas.height = H;
  warpedCanvas.getContext('2d')!.drawImage(warped.bitmap, 0, 0);
  warped.bitmap.close?.();
  const warpedImg = warpedCanvas.getContext('2d')!.getImageData(0, 0, W, H);
  await yieldToBrowser();

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const outCtx = out.getContext('2d')!;
  if (outputFormat === 'jpeg') {
    outCtx.fillStyle = '#FFFFFF';
    outCtx.fillRect(0, 0, W, H);
  }
  const outImg = outCtx.getImageData(0, 0, W, H);
  const totalPixels = W * H;
  const CHUNK = W * 64; // ~64 rows per yield
  for (let start = 0; start < totalPixels; start += CHUNK) {
    const end = Math.min(start + CHUNK, totalPixels);
    for (let i = start; i < end; i += 1) {
      const j = i * 4;
      const a = fullMaskData.data[j];
      if (outputFormat === 'png') {
        outImg.data[j] = warpedImg.data[j];
        outImg.data[j + 1] = warpedImg.data[j + 1];
        outImg.data[j + 2] = warpedImg.data[j + 2];
        outImg.data[j + 3] = a;
      } else {
        const alpha = a / 255;
        outImg.data[j] = Math.round(warpedImg.data[j] * alpha + 255 * (1 - alpha));
        outImg.data[j + 1] = Math.round(warpedImg.data[j + 1] * alpha + 255 * (1 - alpha));
        outImg.data[j + 2] = Math.round(warpedImg.data[j + 2] * alpha + 255 * (1 - alpha));
        outImg.data[j + 3] = 255;
      }
    }
    if (end < totalPixels) await yieldToBrowser();
  }
  outCtx.putImageData(outImg, 0, 0);

  const mime = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
  const quality = outputFormat === 'png' ? undefined : 0.92;
  const blob: Blob = await new Promise((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), mime, quality);
  });
  const blobKey = uid();
  await putBlob(blobKey, blob);
  bitmap.close?.();

  const meta: EnhanceMeta = {
    backend: 'onnx',
    quad: quadSource,
    quadAuto,
    coveragePct,
    modelId: MODEL_ID,
    tookMs: performance.now() - t0,
    createdAt: Date.now(),
  };

  const page: PageAsset = {
    ...source,
    blobKey,
    width: W,
    height: H,
    mime,
    originalBlobKey: source.originalBlobKey ?? source.blobKey,
    enhancedBlobKey: blobKey,
    useEnhanced: true,
    enhanceMeta: meta,
  };

  return { page, meta, success: true };
}

export const onnxBackend: EnhanceBackend = {
  id: 'onnx',
  label: 'Better quality (on-device ML)',
  enhance: runPipeline,
  detectQuad: classicalBackend.detectQuad,
};
