import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { CardMetadata } from '../../types/card';
import { loadVisionImages } from './images';
import {
  MetadataSchema,
  SYSTEM_PROMPT,
  USER_INSTRUCTION,
  toMetadataPatch,
  type AutofillInput,
} from './types';

export async function openaiAutofill(
  apiKey: string,
  model: string,
  input: AutofillInput,
): Promise<Partial<CardMetadata>> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const images = await loadVisionImages(input.pages, input.pageOrder);
  if (images.length === 0) throw new Error('No page images available.');

  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    ...images.map<OpenAI.Chat.ChatCompletionContentPart>((img) => ({
      type: 'image_url',
      image_url: { url: img.dataUrl, detail: 'high' },
    })),
    { type: 'text', text: USER_INSTRUCTION },
  ];

  const completion = await client.chat.completions.parse({
    model,
    max_completion_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: zodResponseFormat(MetadataSchema, 'card_metadata'),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    const refusal = completion.choices[0]?.message.refusal;
    throw new Error(refusal || 'OpenAI returned no parseable output.');
  }
  return toMetadataPatch(parsed);
}
