import { z } from 'zod';
import type { CardMetadata, PageAsset } from '../../types/card';

export type ProviderId = 'anthropic' | 'openai' | 'gemini';

export interface AutofillInput {
  pages: Record<string, PageAsset>;
  pageOrder: string[];
}

export type AutofillFn = (input: AutofillInput) => Promise<Partial<CardMetadata>>;

export const PROVIDERS: { id: ProviderId; label: string; keyHint: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', keyHint: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI (GPT)', keyHint: 'sk-...' },
  { id: 'gemini', label: 'Google (Gemini)', keyHint: 'AIza...' },
];

export const DEFAULT_MODEL: Record<ProviderId, string> = {
  anthropic: 'claude-opus-4-7',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
};

export const OCCASION_VALUES = [
  'birthday',
  'wedding',
  'graduation',
  'sympathy',
  'new-year',
  'valentines',
  'easter',
  'mothers-day',
  'fathers-day',
  'thanksgiving',
  'christmas',
  'hanukkah',
  'eid',
  'diwali',
  'holiday',
  'other',
] as const;

export const MetadataSchema = z.object({
  title: z
    .string()
    .max(80)
    .describe('Short evocative title for the card. Empty if unclear.'),
  occasion: z
    .enum(OCCASION_VALUES)
    .describe('Best-fit occasion. Prefer specific holiday values over generic "holiday".'),
  from: z
    .string()
    .max(80)
    .describe('Sender, from signatures like "Love, Mom". Empty if unclear.'),
  to: z
    .string()
    .max(80)
    .describe('Recipient if visibly addressed (e.g. "Dear Jane"). Empty if unclear.'),
  dateReceived: z
    .string()
    .describe('ISO yyyy-mm-dd if a date is visible on the card, else "".'),
  note: z
    .string()
    .max(280)
    .describe('One-sentence summary of the sentiment. Empty if unclear.'),
  message: z
    .string()
    .max(2000)
    .describe(
      'Verbatim transcription of all text on the card. Preserve line breaks with \\n. Use [illegible] for unreadable words.',
    ),
});

export type ParsedMetadata = z.infer<typeof MetadataSchema>;

export const SYSTEM_PROMPT = `You transcribe and classify photographs of physical greeting cards.

Your job is two things, done carefully:
1. TRANSCRIBE the text on the card — both the printed greeting AND the handwritten personal message — into the "message" field. Preserve line breaks with \\n. Do not paraphrase or clean up. If a word is unreadable, write [illegible]. If the card has printed text on the front (e.g. "EASTER WISHES") and a handwritten note inside, include both, separated by a blank line.
2. Extract structured metadata: title, occasion, from, to, dateReceived, note.

Occasion rules — use the most specific match:
- birthday | wedding | graduation | sympathy — life events
- new-year | valentines | easter | mothers-day | fathers-day | thanksgiving | christmas | hanukkah | eid | diwali — specific holidays
- holiday — a holiday card that doesn't fit the above
- other — none of the above

Field rules:
- from: extract from signatures like "Love, Mom" → "Mom". Multiple signers → comma-separated.
- to: from salutations like "Dear Michelle" → "Michelle".
- dateReceived: only if a date is visibly printed or written on the card, else "".
- title: short, evocative — often inferable from the printed front ("Easter Wishes") or the relationship ("Mom's 60th").
- note: one sentence capturing the overall tone. Short summary, not the transcription.
- Never invent names, dates, or sentiments. Empty string is always acceptable.`;

export const USER_INSTRUCTION =
  'Analyze these pages of a greeting card. Transcribe all visible text and return the metadata JSON.';

export function toMetadataPatch(parsed: ParsedMetadata): Partial<CardMetadata> {
  const patch: Partial<CardMetadata> = {
    title: parsed.title,
    occasion: parsed.occasion,
    from: parsed.from,
    to: parsed.to,
    note: parsed.note,
    message: parsed.message,
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(parsed.dateReceived)) {
    patch.dateReceived = parsed.dateReceived;
  }
  return patch;
}
