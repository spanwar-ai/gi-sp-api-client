import { create } from 'zustand';
import type { Environment } from '../types';

interface EnvironmentState {
  environments: Environment[];
  setEnvironments: (environments: Environment[]) => void;
  getActive: () => Environment | undefined;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  setEnvironments: (environments) => set({ environments }),
  getActive: () => get().environments.find((e) => e.isActive),
}));
