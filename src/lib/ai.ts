import type { CardMetadata } from '../types/card';
import {
  DEFAULT_MODEL,
  PROVIDERS,
  type AutofillInput,
  type ProviderId,
} from './providers/types';

const PROVIDER_STORAGE = 'cs:provider';
const keyStorage = (id: ProviderId) => `cs:${id}-key`;
const modelStorage = (id: ProviderId) => `cs:${id}-model`;

function isProviderId(v: unknown): v is ProviderId {
  return typeof v === 'string' && PROVIDERS.some((p) => p.id === v);
}

export { PROVIDERS, DEFAULT_MODEL };
export type { ProviderId } from './providers/types';

export function getProvider(): ProviderId {
  const v = localStorage.getItem(PROVIDER_STORAGE);
  return isProviderId(v) ? v : 'anthropic';
}

export function setProvider(id: ProviderId): void {
  localStorage.setItem(PROVIDER_STORAGE, id);
}

export function getApiKey(provider: ProviderId = getProvider()): string {
  return localStorage.getItem(keyStorage(provider)) ?? '';
}

export function setApiKey(key: string, provider: ProviderId = getProvider()): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(keyStorage(provider), trimmed);
  else localStorage.removeItem(keyStorage(provider));
}

export function getModel(provider: ProviderId = getProvider()): string {
  return localStorage.getItem(modelStorage(provider)) ?? DEFAULT_MODEL[provider];
}

export function setModel(model: string, provider: ProviderId = getProvider()): void {
  const trimmed = model.trim();
  if (trimmed) localStorage.setItem(modelStorage(provider), trimmed);
  else localStorage.removeItem(modelStorage(provider));
}

export async function autofillMetadata(
  pages: Record<string, import('../types/card').PageAsset>,
  pageOrder: string[],
): Promise<Partial<CardMetadata>> {
  const provider = getProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(
      `Add your ${providerLabel(provider)} API key in Settings first.`,
    );
  }
  if (pageOrder.length === 0) {
    throw new Error('Add at least one page before auto-filling.');
  }
  const model = getModel(provider);
  const input: AutofillInput = { pages, pageOrder };

  if (provider === 'anthropic') {
    const mod = await import('./providers/anthropic');
    return mod.anthropicAutofill(apiKey, model, input);
  }
  if (provider === 'openai') {
    const mod = await import('./providers/openai');
    return mod.openaiAutofill(apiKey, model, input);
  }
  if (provider === 'gemini') {
    const mod = await import('./providers/gemini');
    return mod.geminiAutofill(apiKey, model, input);
  }
  throw new Error(`Unknown provider: ${provider}`);
}

function providerLabel(id: ProviderId): string {
  return PROVIDERS.find((p) => p.id === id)?.label ?? id;
}
