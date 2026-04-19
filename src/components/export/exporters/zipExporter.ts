import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { getBlob } from '../../../lib/db';
import type { Card } from '../../../types/card';

export async function exportZip(card: Card): Promise<void> {
  const zip = new JSZip();
  const metadata = {
    ...card.metadata,
    createdAt: new Date(card.createdAt).toISOString(),
    updatedAt: new Date(card.updatedAt).toISOString(),
    pageCount: card.pageOrder.length,
  };
  zip.file('card.json', JSON.stringify(metadata, null, 2));

  let i = 1;
  for (const pid of card.pageOrder) {
    const page = card.pages[pid];
    if (!page) continue;
    const blob = await getBlob(page.blobKey);
    if (!blob) continue;
    const ext = page.mime === 'image/png' ? 'png' : 'jpg';
    const name = `page-${String(i).padStart(2, '0')}.${ext}`;
    zip.file(name, blob);
    i += 1;
  }

  const out = await zip.generateAsync({ type: 'blob' });
  const filename =
    (card.metadata.title || 'card').replace(/[^a-z0-9-_ ]/gi, '') || 'card';
  saveAs(out, `${filename}.zip`);
}
