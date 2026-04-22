// LLM image-edit enhance backend (Architecture D from PRD Appendix B).
// Sends the page to a BYOK image-editing model and stores the returned image
// as the enhanced asset. No OpenCV / ONNX involvement — the model handles
// dewarp + background removal in one shot.
//
// Providers:
//   - llm-gemini → Google `gemini-2.5-flash-image`
//   - llm-openai → OpenAI `gpt-image-1`
// Anthropic is vision-in only and cannot produce images, so it is not offered.
//
// Fidelity caveat (documented in PRD §B.5): these models are non-deterministic
// and can subtly redraw handwriting. UI shows a warning. Originals remain
// untouched in IDB (enhance pipeline is non-destructive).
import type { PageAsset } from '../../types/card';
import { getApiKey } from '../ai';
import { getBlob, putBlob } from '../db';
import { uid } from '../imageUtils';
import type {
  EnhanceBackend,
  EnhanceMeta,
  EnhanceOptions,
  EnhanceResult,
  LlmBackendId,
} from './types';

const IMAGE_MODEL: Record<LlmBackendId, string> = {
  'llm-gemini': 'gemini-2.5-flash-image',
  'llm-openai': 'gpt-image-1',
};

const PROMPT = [
  'Rectify this photograph of a physical greeting card to a clean top-down flat-scan view.',
  'Detect the card itself and crop tight to its edges. Correct perspective so the card is rectangular and viewed straight-on.',
  'Remove everything outside the card (hands, table, background, shadows). Output a PNG with a transparent background outside the card.',
  'FIDELITY RULES — do not violate:',
  '- Do not alter, re-draw, re-style, clean up, or translate any text, handwriting, signatures, stamps, or artwork on the card.',
  '- Preserve every pen stroke, ink color, and paper texture exactly as captured.',
  '- Do not remove stains, creases, or imperfections on the card face itself — only the surrounding background.',
  '- If the card is folded or curved, flatten the perspective but do not invent detail in occluded areas; keep any natural fold lines visible.',
].join('\n');

async function loadSourceBlob(source: PageAsset): Promise<Blob> {
  const blob = await getBlob(source.blobKey);
  if (!blob) throw new Error('Source blob missing');
  return blob;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function measureImage(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return dims;
}

async function callGemini(apiKey: string, model: string, blob: Blob): Promise<Blob> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const base64 = await blobToBase64(blob);
  const mime = blob.type || 'image/jpeg';
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mime, data: base64 } },
          { text: PROMPT },
        ],
      },
    ],
    config: { responseModalities: ['IMAGE'] },
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = (part as { inlineData?: { mimeType?: string; data?: string } }).inlineData;
    if (inline?.data) {
      return base64ToBlob(inline.data, inline.mimeType || 'image/png');
    }
  }
  throw new Error('Gemini returned no image. Check that the model supports image output.');
}

async function callOpenAI(apiKey: string, model: string, blob: Blob): Promise<Blob> {
  const { default: OpenAI, toFile } = await import('openai');
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  // gpt-image-1 edit endpoint accepts PNG/JPEG/WEBP. No mask required —
  // the prompt alone drives the edit.
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const image = await toFile(blob, `page.${ext}`, { type: blob.type || 'image/jpeg' });
  const response = await client.images.edit({
    model,
    image,
    prompt: PROMPT,
    size: 'auto',
    background: 'transparent',
    output_format: 'png',
  });
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI returned no image data.');
  return base64ToBlob(b64, 'image/png');
}

function makeBackend(id: LlmBackendId, label: string): EnhanceBackend {
  return {
    id,
    label,
    async enhance(source: PageAsset, _opts: EnhanceOptions): Promise<EnhanceResult> {
      void _opts; // outputFormat/quadOverride are not honored — the model owns geometry & format.
      const t0 = performance.now();
      const providerId = id === 'llm-gemini' ? 'gemini' : 'openai';
      const apiKey = getApiKey(providerId);
      if (!apiKey) {
        throw new Error(
          `Add your ${providerId === 'gemini' ? 'Google (Gemini)' : 'OpenAI'} API key in Settings to use AI enhance.`,
        );
      }
      const model = IMAGE_MODEL[id];
      const sourceBlob = await loadSourceBlob(source);

      const editedBlob =
        id === 'llm-gemini'
          ? await callGemini(apiKey, model, sourceBlob)
          : await callOpenAI(apiKey, model, sourceBlob);

      const { width, height } = await measureImage(editedBlob);
      const mime = editedBlob.type || 'image/png';

      const blobKey = uid();
      await putBlob(blobKey, editedBlob);

      // LLM handles its own crop; record a full-frame quad as a placeholder
      // so downstream code that reads `quad` doesn't crash. The `modelId`
      // field records which LLM produced the image, parallel to onnx backend.
      const meta: EnhanceMeta = {
        backend: id,
        quad: [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ],
        quadAuto: true,
        coveragePct: 1,
        modelId: model,
        tookMs: performance.now() - t0,
        createdAt: Date.now(),
      };

      const page: PageAsset = {
        ...source,
        blobKey,
        width,
        height,
        mime,
        originalBlobKey: source.originalBlobKey ?? source.blobKey,
        enhancedBlobKey: blobKey,
        useEnhanced: true,
        enhanceMeta: meta,
      };

      return { page, meta, success: true };
    },
    async detectQuad() {
      // LLM backends do their own geometry — no quad preview for the
      // manual-corners editor. Return a null quad so UI can hide the
      // "Adjust corners" affordance.
      return { quad: null, coveragePct: 0, frameSize: { width: 0, height: 0 } };
    },
  };
}

export const llmGeminiBackend = makeBackend('llm-gemini', 'AI enhance — Gemini (BYOK)');
export const llmOpenaiBackend = makeBackend('llm-openai', 'AI enhance — OpenAI (BYOK)');
