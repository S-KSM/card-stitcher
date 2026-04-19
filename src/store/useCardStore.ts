import { create } from 'zustand';
import { listCards, deleteCard as dbDelete } from '../lib/db';
import type { Card } from '../types/card';

interface CardStoreState {
  cards: Card[];
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useCardStore = create<CardStoreState>((set) => ({
  cards: [],
  loading: false,
  refresh: async () => {
    set({ loading: true });
    const cards = await listCards();
    set({ cards, loading: false });
  },
  remove: async (id) => {
    await dbDelete(id);
    const cards = await listCards();
    set({ cards });
  },
}));
