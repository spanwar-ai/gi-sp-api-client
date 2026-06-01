import { create } from 'zustand';
import type { SidebarTab, RequestTab, ResponseTab, UserRole } from '../types';

interface UIState {
  isActivated: boolean | null;
  userRole: UserRole | null;
  expiryDate: string | null;
  sidebarTab: SidebarTab;
  requestTab: RequestTab;
  responseTab: ResponseTab;
  isSidebarCollapsed: boolean;
  activeModal: string | null;
  notifications: Array<{ id: string; level: 'info' | 'warning' | 'error'; message: string }>;

  setActivation: (activated: boolean, role: UserRole | null, expiryDate: string | null) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setRequestTab: (tab: RequestTab) => void;
  setResponseTab: (tab: ResponseTab) => void;
  toggleSidebar: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  addNotification: (level: 'info' | 'warning' | 'error', message: string) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isActivated: null,
  userRole: null,
  expiryDate: null,
  sidebarTab: 'collections',
  requestTab: 'params',
  responseTab: 'body',
  isSidebarCollapsed: false,
  activeModal: null,
  notifications: [],

  setActivation: (activated, role, expiryDate) =>
    set({ isActivated: activated, userRole: role, expiryDate }),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setRequestTab: (tab) => set({ requestTab: tab }),
  setResponseTab: (tab) => set({ responseTab: tab }),
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  addNotification: (level, message) =>
    set((s) => ({
      notifications: [...s.notifications, { id: crypto.randomUUID(), level, message }],
    })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
