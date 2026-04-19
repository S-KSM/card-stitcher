import { GoogleGenAI, Type } from '@google/genai';
import type { CardMetadata } from '../../types/card';
import { loadVisionImages } from './images';
import {
  MetadataSchema,
  OCCASION_VALUES,
  SYSTEM_PROMPT,
  USER_INSTRUCTION,
  toMetadataPatch,
} from './types';
import type { AutofillInput } from './types';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Short evocative title, empty if unclear.' },
    occasion: { type: Type.STRING, enum: [...OCCASION_VALUES] },
    from: { type: Type.STRING, description: 'Sender from signatures; empty if unclear.' },
    to: { type: Type.STRING, description: 'Recipient from salutations; empty if unclear.' },
    dateReceived: { type: Type.STRING, description: 'ISO yyyy-mm-dd or empty.' },
    note: { type: Type.STRING, description: 'One-sentence summary.' },
    message: { type: Type.STRING, description: 'Verbatim transcription with \\n line breaks.' },
  },
  required: ['title', 'occasion', 'from', 'to', 'dateReceived', 'note', 'message'],
  propertyOrdering: ['title', 'occasion', 'from', 'to', 'dateReceived', 'note', 'message'],
};

export async function geminiAutofill(
  apiKey: string,
  model: string,
  input: AutofillInput,
): Promise<Partial<CardMetadata>> {
  const ai = new GoogleGenAI({ apiKey });
  const images = await loadVisionImages(input.pages, input.pageOrder);
  if (images.length === 0) throw new Error('No page images available.');

  const parts = [
    ...images.map((img) => ({
      inlineData: { mimeType: img.mime, data: img.base64 },
    })),
    { text: USER_INSTRUCTION },
  ];

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema,
      maxOutputTokens: 4096,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned no text output.');

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Gemini output was not valid JSON.');
  }
  const parsed = MetadataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Gemini output failed validation: ' + parsed.error.message);
  }
  return toMetadataPatch(parsed.data);
}
