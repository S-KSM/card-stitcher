import { create } from 'zustand';
import type { Card, CardMetadata, PageAsset } from '../types/card';
import { DEFAULT_METADATA, MAX_PAGES } from '../types/card';
import { putBlob, saveCard, loadCard, getBlob } from '../lib/db';
import { blobUrl, processImageFile, uid } from '../lib/imageUtils';

interface EditorState {
  cardId: string | null;
  createdAt: number;
  pageOrder: string[];
  pages: Record<string, PageAsset>;
  pageUrls: Record<string, string>;
  metadata: CardMetadata;
  dirty: boolean;
  initNew: () => void;
  hydrate: (cardId: string) => Promise<boolean>;
  addFiles: (files: File[]) => Promise<string[]>;
  removePage: (id: string) => void;
  reorder: (newOrder: string[]) => void;
  updateMetadata: (patch: Partial<CardMetadata>) => void;
  canAdd: () => number;
  persist: () => Promise<string>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  cardId: null,
  createdAt: 0,
  pageOrder: [],
  pages: {},
  pageUrls: {},
  metadata: { ...DEFAULT_METADATA },
  dirty: false,

  initNew: () =>
    set({
      cardId: uid(),
      createdAt: Date.now(),
      pageOrder: [],
      pages: {},
      pageUrls: {},
      metadata: { ...DEFAULT_METADATA },
      dirty: false,
    }),

  hydrate: async (cardId: string) => {
    const card = await loadCard(cardId);
    if (!card) return false;
    const urls: Record<string, string> = {};
    for (const pid of card.pageOrder) {
      const p = card.pages[pid];
      if (p) {
        const blob = await getBlob(p.blobKey);
        if (blob) urls[pid] = blobUrl(p.blobKey, blob);
      }
    }
    set({
      cardId: card.id,
      createdAt: card.createdAt,
      pageOrder: card.pageOrder,
      pages: card.pages,
      pageUrls: urls,
      metadata: { ...DEFAULT_METADATA, ...card.metadata },
      dirty: false,
    });
    return true;
  },

  canAdd: () => MAX_PAGES - get().pageOrder.length,

  addFiles: async (files: File[]) => {
    const slotsLeft = get().canAdd();
    const toAdd = files.slice(0, Math.max(0, slotsLeft));
    const newIds: string[] = [];
    for (const file of toAdd) {
      try {
        const processed = await processImageFile(file);
        const id = uid();
        const blobKey = id;
        await putBlob(blobKey, processed.blob);
        const page: PageAsset = {
          id,
          blobKey,
          width: processed.width,
          height: processed.height,
          mime: processed.mime,
        };
        const url = blobUrl(blobKey, processed.blob);
        set((s) => ({
          pageOrder: [...s.pageOrder, id],
          pages: { ...s.pages, [id]: page },
          pageUrls: { ...s.pageUrls, [id]: url },
          dirty: true,
        }));
        newIds.push(id);
      } catch (err) {
        console.error('Failed to add image', err);
      }
    }
    return newIds;
  },

  removePage: (id: string) =>
    set((s) => {
      const { [id]: _removed, ...pages } = s.pages;
      const { [id]: _url, ...pageUrls } = s.pageUrls;
      void _removed;
      void _url;
      return {
        pageOrder: s.pageOrder.filter((p) => p !== id),
        pages,
        pageUrls,
        dirty: true,
      };
    }),

  reorder: (newOrder: string[]) =>
    set({ pageOrder: newOrder, dirty: true }),

  updateMetadata: (patch) =>
    set((s) => ({ metadata: { ...s.metadata, ...patch }, dirty: true })),

  persist: async () => {
    const state = get();
    if (!state.cardId) throw new Error('No cardId');
    const card: Card = {
      id: state.cardId,
      createdAt: state.createdAt || Date.now(),
      updatedAt: Date.now(),
      pageOrder: state.pageOrder,
      pages: state.pages,
      metadata: state.metadata,
      coverBlobKey: state.pageOrder[0]
        ? state.pages[state.pageOrder[0]]?.blobKey
        : undefined,
    };
    await saveCard(card);
    set({ dirty: false });
    return card.id;
  },
}));
