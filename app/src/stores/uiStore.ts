import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Toast } from '@/types';

interface UIStore {
  toasts: Toast[];
  theme: 'dark' | 'light' | 'system';
  isExporting: boolean;
  isPrintPreview: boolean;
  showSlashCommands: boolean;
  slashCommandQuery: string;
  slashCommandPos: number;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setIsExporting: (exporting: boolean) => void;
  setIsPrintPreview: (preview: boolean) => void;
  setShowSlashCommands: (show: boolean) => void;
  setSlashCommandQuery: (query: string) => void;
  setSlashCommandPos: (pos: number) => void;
}

let toastIdCounter = 0;

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      toasts: [],
      theme: 'dark',
      isExporting: false,
      isPrintPreview: false,
      showSlashCommands: false,
      slashCommandQuery: '',
      slashCommandPos: 0,

      addToast: (toast) => {
        const id = `toast-${++toastIdCounter}-${Date.now()}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, toast.duration || 3000);
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setTheme: (theme) => set({ theme }),
      setIsExporting: (exporting) => set({ isExporting: exporting }),
      setIsPrintPreview: (preview) => set({ isPrintPreview: preview }),
      setShowSlashCommands: (show) => set({ showSlashCommands: show }),
      setSlashCommandQuery: (query) => set({ slashCommandQuery: query }),
      setSlashCommandPos: (pos) => set({ slashCommandPos: pos }),
    }),
    {
      name: 'zwrite-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);
