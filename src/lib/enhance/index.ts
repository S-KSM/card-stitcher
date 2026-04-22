import type { PageAsset } from '../../types/card';
import {
  DEFAULT_BACKEND,
  type EnhanceBackend,
  type EnhanceBackendId,
  type EnhanceOptions,
  type EnhanceResult,
} from './types';

export { ENHANCE_BACKENDS, DEFAULT_BACKEND, isLlmBackend } from './types';
export type {
  EnhanceBackendId,
  EnhanceBackend,
  EnhanceOptions,
  EnhanceResult,
  Quad,
  Point,
  EnhanceMeta,
  LlmBackendId,
} from './types';

const STORAGE_KEY = 'cs:enhance-backend';

function isBackendId(v: unknown): v is EnhanceBackendId {
  return v === 'classical' || v === 'onnx' || v === 'llm-gemini' || v === 'llm-openai';
}

export function getEnhanceBackendId(): EnhanceBackendId {
  const v = localStorage.getItem(STORAGE_KEY);
  return isBackendId(v) ? v : DEFAULT_BACKEND;
}

export function setEnhanceBackendId(id: EnhanceBackendId): void {
  localStorage.setItem(STORAGE_KEY, id);
}

async function loadBackend(id: EnhanceBackendId): Promise<EnhanceBackend> {
  if (id === 'classical') {
    const mod = await import('./classical');
    return mod.classicalBackend;
  }
  if (id === 'onnx') {
    const mod = await import('./onnx');
    return mod.onnxBackend;
  }
  if (id === 'llm-gemini') {
    const mod = await import('./llm');
    return mod.llmGeminiBackend;
  }
  if (id === 'llm-openai') {
    const mod = await import('./llm');
    return mod.llmOpenaiBackend;
  }
  throw new Error(`Unknown enhance backend: ${id}`);
}

export async function enhancePage(
  source: PageAsset,
  opts: EnhanceOptions = {},
  backendId: EnhanceBackendId = getEnhanceBackendId(),
): Promise<EnhanceResult> {
  const backend = await loadBackend(backendId);
  return backend.enhance(source, opts);
}

export async function detectPageQuad(
  source: PageAsset,
  backendId: EnhanceBackendId = 'classical',
) {
  const backend = await loadBackend(backendId);
  return backend.detectQuad(source);
}
