import { create } from 'zustand';
import type { HistoryEntry } from '../types';

interface HistoryState {
  entries: HistoryEntry[];
  setEntries: (entries: HistoryEntry[]) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
}));
