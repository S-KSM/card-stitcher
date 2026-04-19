import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { getBlob } from '../../../lib/db';
import type { Card } from '../../../types/card';

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer();
}

export async function exportPdf(card: Card): Promise<void> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(card.metadata.title || 'Card');
  pdf.setAuthor(card.metadata.from || 'Card Stitcher');
  pdf.setSubject(card.metadata.occasion);
  pdf.setKeywords(['card-stitcher', card.metadata.occasion]);
  if (card.metadata.note) pdf.setProducer(card.metadata.note);

  for (const pid of card.pageOrder) {
    const page = card.pages[pid];
    if (!page) continue;
    const blob = await getBlob(page.blobKey);
    if (!blob) continue;
    const bytes = await blobToArrayBuffer(blob);
    const img =
      page.mime === 'image/png'
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
    const pdfPage = pdf.addPage([img.width, img.height]);
    pdfPage.drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  }

  const pdfBytes = await pdf.save();
  const copy = new Uint8Array(pdfBytes);
  const filename = (card.metadata.title || 'card').replace(/[^a-z0-9-_ ]/gi, '') || 'card';
  saveAs(new Blob([copy], { type: 'application/pdf' }), `${filename}.pdf`);
}
