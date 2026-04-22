// Classical CV enhance: all OpenCV work offloaded to cv-worker.
import type { PageAsset } from '../../types/card';
import { getBlob, putBlob } from '../db';
import { uid } from '../imageUtils';
import { bitmapToBlob, workerDetectQuad, workerWarp } from './cv-client';
import { defaultInsetQuad, quadArea, scaleQuad } from './geometry';
import type {
  EnhanceBackend,
  EnhanceMeta,
  EnhanceOptions,
  EnhanceResult,
  Quad,
} from './types';

const DEFAULT_MAX_EDGE = 2048;
const WORK_MAX_EDGE = 2048;

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

async function detectQuadForPage(source: PageAsset) {
  const { bitmap } = await loadBitmap(source);
  return workerDetectQuad(bitmap);
}

async function runPipeline(
  source: PageAsset,
  opts: EnhanceOptions,
): Promise<EnhanceResult> {
  const t0 = performance.now();
  const outputFormat = opts.outputFormat ?? 'jpeg';
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;

  const { bitmap, scale: sourceScale } = await loadBitmap(source, WORK_MAX_EDGE);

  // Detection path — we need quad in work-bitmap coords for warp,
  // and in source coords for persisting meta.
  let quadWork: Quad | null = null;
  let quadAuto = false;
  let coveragePct = 0;
  if (opts.quadOverride) {
    quadWork = sourceScale === 1
      ? opts.quadOverride
      : scaleQuad(opts.quadOverride, sourceScale, sourceScale);
    coveragePct = quadArea(quadWork) / (bitmap.width * bitmap.height);
  } else {
    // Detection needs its own bitmap copy — worker consumes via transfer.
    const detectBitmap = await createImageBitmap(bitmap);
    const detection = await workerDetectQuad(detectBitmap);
    quadWork = detection.quad;
    coveragePct = detection.coveragePct;
    quadAuto = true;
  }

  if (!quadWork) {
    bitmap.close?.();
    const meta: EnhanceMeta = {
      backend: 'classical',
      quad: defaultInsetQuad(bitmap.width / sourceScale, bitmap.height / sourceScale),
      quadAuto: true,
      coveragePct,
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

  const warped = await workerWarp(bitmap, quadWork, outputFormat, maxEdge);
  const blob = await bitmapToBlob(warped.bitmap, outputFormat, outputFormat === 'jpeg' ? 0.92 : undefined);
  warped.bitmap.close?.();

  const blobKey = uid();
  await putBlob(blobKey, blob);

  const sourceQuad: Quad =
    sourceScale === 1 ? quadWork : scaleQuad(quadWork, 1 / sourceScale, 1 / sourceScale);

  const meta: EnhanceMeta = {
    backend: 'classical',
    quad: sourceQuad,
    quadAuto,
    coveragePct,
    tookMs: performance.now() - t0,
    createdAt: Date.now(),
  };

  const page: PageAsset = {
    ...source,
    blobKey,
    width: warped.width,
    height: warped.height,
    mime: outputFormat === 'png' ? 'image/png' : 'image/jpeg',
    originalBlobKey: source.originalBlobKey ?? source.blobKey,
    enhancedBlobKey: blobKey,
    useEnhanced: true,
    enhanceMeta: meta,
  };

  return { page, meta, success: true };
}

export const classicalBackend: EnhanceBackend = {
  id: 'classical',
  label: 'Fast (classical CV)',
  enhance: runPipeline,
  detectQuad: detectQuadForPage,
};
