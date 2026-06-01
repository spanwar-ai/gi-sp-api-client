import { create } from 'zustand';
import type { ApiResponse } from '../types';

interface ResponseState {
  responses: Record<string, ApiResponse>;
  curl: string | null;
  alCode: string | null;

  setResponse: (requestId: string, response: ApiResponse) => void;
  clearResponse: (requestId: string) => void;
  setCurl: (curl: string) => void;
  clearCurl: () => void;
  setAlCode: (code: string) => void;
  clearAlCode: () => void;
}

export const useResponseStore = create<ResponseState>((set) => ({
  responses: {},
  curl: null,
  alCode: null,

  setResponse: (requestId, response) =>
    set((s) => ({ responses: { ...s.responses, [requestId]: response } })),

  clearResponse: (requestId) =>
    set((s) => {
      const { [requestId]: _, ...rest } = s.responses;
      return { responses: rest };
    }),

  setCurl: (curl) => set({ curl }),
  clearCurl: () => set({ curl: null }),
  setAlCode: (code) => set({ alCode: code }),
  clearAlCode: () => set({ alCode: null }),
}));
