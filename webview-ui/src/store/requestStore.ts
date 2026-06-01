import { create } from 'zustand';
import type { ApiRequest, HttpMethod, KeyValue, RequestBody, AuthConfig } from '../types';
import { createDefaultRequest } from '../types';

interface RequestState {
  openTabs: ApiRequest[];
  activeTabId: string | null;
  isLoading: boolean;
  loadingRequestId: string | null;

  addTab: (request?: ApiRequest) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateActiveRequest: (updates: Partial<ApiRequest>) => void;
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setHeaders: (headers: KeyValue[]) => void;
  setParams: (params: KeyValue[]) => void;
  setBody: (body: RequestBody) => void;
  setAuth: (auth: AuthConfig) => void;
  setLoading: (loading: boolean, requestId?: string) => void;
  loadRequest: (request: ApiRequest) => void;
  getActiveRequest: () => ApiRequest | undefined;
}

export const useRequestStore = create<RequestState>((set, get) => {
  const initial = createDefaultRequest();

  return {
    openTabs: [initial],
    activeTabId: initial.id,
    isLoading: false,
    loadingRequestId: null,

    addTab: (request) => {
      const newReq = request || createDefaultRequest();
      set((s) => ({
        openTabs: [...s.openTabs, newReq],
        activeTabId: newReq.id,
      }));
    },

    removeTab: (id) => {
      set((s) => {
        const tabs = s.openTabs.filter((t) => t.id !== id);
        let activeTabId = s.activeTabId;
        if (activeTabId === id) {
          activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
        }
        if (tabs.length === 0) {
          const def = createDefaultRequest();
          return { openTabs: [def], activeTabId: def.id };
        }
        return { openTabs: tabs, activeTabId };
      });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateActiveRequest: (updates) => {
      set((s) => ({
        openTabs: s.openTabs.map((t) =>
          t.id === (s.activeTabId || s.openTabs[0]?.id) ? { ...t, ...updates } : t
        ),
      }));
    },

    setMethod: (method) => get().updateActiveRequest({ method }),
    setUrl: (url) => get().updateActiveRequest({ url }),
    setHeaders: (headers) => get().updateActiveRequest({ headers }),
    setParams: (params) => get().updateActiveRequest({ params }),
    setBody: (body) => get().updateActiveRequest({ body }),
    setAuth: (auth) => get().updateActiveRequest({ auth }),

    setLoading: (loading, requestId) =>
      set({ isLoading: loading, loadingRequestId: requestId || null }),

    loadRequest: (request) => {
      set((s) => {
        const existing = s.openTabs.find((t) => t.id === request.id);
        if (existing) {
          return { activeTabId: request.id };
        }
        return {
          openTabs: [...s.openTabs, { ...request }],
          activeTabId: request.id,
        };
      });
    },

    getActiveRequest: () => {
      const s = get();
      return s.openTabs.find((t) => t.id === s.activeTabId) || s.openTabs[0];
    },
  };
});
