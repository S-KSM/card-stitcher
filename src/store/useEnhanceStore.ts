import { create } from 'zustand';

export type EnhanceStatus =
  | { kind: 'idle' }
  | { kind: 'running'; message?: string }
  | { kind: 'preview'; pageId: string }
  | { kind: 'manual'; pageId: string; reason: 'no-quad' | 'low-coverage' | 'error' }
  | { kind: 'error'; message: string };

interface EnhanceState {
  perPage: Record<string, EnhanceStatus>;
  batch: { total: number; done: number } | null;
  setStatus: (pageId: string, status: EnhanceStatus) => void;
  clear: (pageId: string) => void;
  setBatch: (batch: { total: number; done: number } | null) => void;
}

export const useEnhanceStore = create<EnhanceState>((set) => ({
  perPage: {},
  batch: null,
  setStatus: (pageId, status) =>
    set((s) => ({ perPage: { ...s.perPage, [pageId]: status } })),
  clear: (pageId) =>
    set((s) => {
      const { [pageId]: _drop, ...rest } = s.perPage;
      void _drop;
      return { perPage: rest };
    }),
  setBatch: (batch) => set({ batch }),
}));
