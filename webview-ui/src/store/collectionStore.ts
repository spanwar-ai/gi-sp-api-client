import { create } from 'zustand';
import type { Collection } from '../types';

interface CollectionState {
  collections: Collection[];
  setCollections: (collections: Collection[]) => void;
}

export const useCollectionStore = create<CollectionState>((set) => ({
  collections: [],
  setCollections: (collections) => set({ collections }),
}));
