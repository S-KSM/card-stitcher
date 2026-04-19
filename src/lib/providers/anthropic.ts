import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { CardMetadata } from '../../types/card';
import { loadVisionImages } from './images';
import {
  MetadataSchema,
  SYSTEM_PROMPT,
  USER_INSTRUCTION,
  toMetadataPatch,
  type AutofillInput,
} from './types';

export async function anthropicAutofill(
  apiKey: string,
  model: string,
  input: AutofillInput,
): Promise<Partial<CardMetadata>> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const images = await loadVisionImages(input.pages, input.pageOrder);
  if (images.length === 0) throw new Error('No page images available.');

  const imageBlocks: Anthropic.ImageBlockParam[] = images.map((img) => ({
    type: 'image',
    source: { type: 'base64', media_type: img.mime, data: img.base64 },
  }));

  const response = await client.messages.parse({
    model,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [...imageBlocks, { type: 'text', text: USER_INSTRUCTION }],
      },
    ],
    output_config: { format: zodOutputFormat(MetadataSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) throw new Error('Claude returned no parseable output. Try again.');
  return toMetadataPatch(parsed);
}
