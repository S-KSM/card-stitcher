import { get, set, del, keys } from 'idb-keyval';
import type { Card } from '../types/card';

const CARD_PREFIX = 'card:';
const BLOB_PREFIX = 'blob:';

export async function saveCard(card: Card): Promise<void> {
  await set(CARD_PREFIX + card.id, card);
}

export async function loadCard(id: string): Promise<Card | undefined> {
  return (await get<Card>(CARD_PREFIX + id)) ?? undefined;
}

export async function deleteCard(id: string): Promise<void> {
  const card = await loadCard(id);
  if (card) {
    for (const pid of card.pageOrder) {
      const page = card.pages[pid];
      if (page) await del(BLOB_PREFIX + page.blobKey);
    }
  }
  await del(CARD_PREFIX + id);
}

export async function listCards(): Promise<Card[]> {
  const allKeys = await keys();
  const cardKeys = allKeys.filter(
    (k): k is string => typeof k === 'string' && k.startsWith(CARD_PREFIX),
  );
  const cards = await Promise.all(cardKeys.map((k) => get<Card>(k)));
  return cards
    .filter((c): c is Card => !!c)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await set(BLOB_PREFIX + key, blob);
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  return (await get<Blob>(BLOB_PREFIX + key)) ?? undefined;
}

export async function requestPersistence(): Promise<boolean> {
  if (navigator.storage?.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}
