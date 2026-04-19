export type Occasion =
  | 'birthday'
  | 'wedding'
  | 'graduation'
  | 'sympathy'
  | 'new-year'
  | 'valentines'
  | 'easter'
  | 'mothers-day'
  | 'fathers-day'
  | 'thanksgiving'
  | 'christmas'
  | 'hanukkah'
  | 'eid'
  | 'diwali'
  | 'holiday'
  | 'other';

export interface CardMetadata {
  title: string;
  occasion: Occasion;
  from: string;
  to: string;
  dateReceived: string; // ISO yyyy-mm-dd
  note: string;
  message: string;
}

export interface PageAsset {
  id: string;
  blobKey: string;
  width: number;
  height: number;
  mime: string;
}

export interface Card {
  id: string;
  createdAt: number;
  updatedAt: number;
  pageOrder: string[];
  pages: Record<string, PageAsset>;
  metadata: CardMetadata;
  coverBlobKey?: string;
}

export const DEFAULT_METADATA: CardMetadata = {
  title: '',
  occasion: 'other',
  from: '',
  to: '',
  dateReceived: new Date().toISOString().slice(0, 10),
  note: '',
  message: '',
};

export const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'sympathy', label: 'Sympathy' },
  { value: 'new-year', label: 'New Year' },
  { value: 'valentines', label: "Valentine's Day" },
  { value: 'easter', label: 'Easter' },
  { value: 'mothers-day', label: "Mother's Day" },
  { value: 'fathers-day', label: "Father's Day" },
  { value: 'thanksgiving', label: 'Thanksgiving' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'hanukkah', label: 'Hanukkah' },
  { value: 'eid', label: 'Eid' },
  { value: 'diwali', label: 'Diwali' },
  { value: 'holiday', label: 'Other Holiday' },
  { value: 'other', label: 'Other' },
];

export const MAX_PAGES = 8;
export const MAX_MESSAGE_LEN = 2000;
export const MAX_NOTE_LEN = 280;
