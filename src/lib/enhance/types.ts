import type { PageAsset } from '../../types/card';

export type EnhanceBackendId = 'classical' | 'onnx' | 'llm-gemini' | 'llm-openai';

export interface Point {
  x: number;
  y: number;
}
export type Quad = [Point, Point, Point, Point]; // TL, TR, BR, BL

export interface EnhanceOptions {
  outputFormat?: 'png' | 'jpeg';
  maxEdge?: number;
  quadOverride?: Quad;
  signal?: AbortSignal;
}

export interface EnhanceMeta {
  backend: EnhanceBackendId;
  quad: Quad;
  quadAuto: boolean;
  coveragePct: number;
  modelId?: string;
  tookMs: number;
  createdAt: number;
}

export interface EnhanceResult {
  page: PageAsset;
  meta: EnhanceMeta;
  success: boolean;
  fallbackReason?: 'no-quad' | 'low-coverage' | 'error';
}

export interface EnhanceBackend {
  id: EnhanceBackendId;
  label: string;
  enhance(source: PageAsset, opts: EnhanceOptions): Promise<EnhanceResult>;
  detectQuad(source: PageAsset): Promise<{ quad: Quad | null; coveragePct: number; frameSize: { width: number; height: number } }>;
}

export const ENHANCE_BACKENDS: { id: EnhanceBackendId; label: string; hint: string }[] = [
  { id: 'classical', label: 'Fast (classical CV)', hint: 'Instant, offline, works best on clean photos.' },
  { id: 'onnx', label: 'Better quality (on-device ML)', hint: 'Uses a small ML model, ~45 MB first-time download. Still 100% on device.' },
  { id: 'llm-gemini', label: 'AI enhance — Gemini (BYOK)', hint: 'Best on messy photos. Uses your Gemini API key (~$0.04/page). May redraw small details.' },
  { id: 'llm-openai', label: 'AI enhance — OpenAI (BYOK)', hint: 'Best on messy photos. Uses your OpenAI API key (~$0.04–0.17/page). May redraw small details.' },
];

export const LLM_BACKEND_IDS = ['llm-gemini', 'llm-openai'] as const;
export type LlmBackendId = (typeof LLM_BACKEND_IDS)[number];
export function isLlmBackend(id: EnhanceBackendId): id is LlmBackendId {
  return id === 'llm-gemini' || id === 'llm-openai';
}

export const DEFAULT_BACKEND: EnhanceBackendId = 'classical';
