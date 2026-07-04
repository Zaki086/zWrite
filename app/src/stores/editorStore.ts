import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EditorState, SearchState, WordStats } from '@/types';

interface EditorStore extends EditorState {
  search: SearchState;
  wordStats: WordStats;
  currentHeading: string | null;

  setZoom: (zoom: number) => void;
  toggleFocusMode: () => void;
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  setSidebarLeft: (open: boolean) => void;
  setSidebarRight: (open: boolean) => void;
  setShowSearch: (show: boolean) => void;
  setSearch: (search: Partial<SearchState>) => void;
  setWordStats: (stats: WordStats) => void;
  setCurrentHeading: (heading: string | null) => void;
  resetSearch: () => void;
}

const defaultSearchState: SearchState = {
  query: '',
  replaceWith: '',
  matches: 0,
  currentMatch: 0,
  isReplaceMode: false,
};

const defaultWordStats: WordStats = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
  paragraphs: 0,
  sentences: 0,
  pages: 0,
  readingTime: 0,
};

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      zoom: 100,
      isFocusMode: false,
      isSidebarLeftOpen: true,
      isSidebarRightOpen: true,
      showSearch: false,
      search: defaultSearchState,
      wordStats: defaultWordStats,
      currentHeading: null,

      setZoom: (zoom) => set({ zoom }),
      toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
      toggleSidebarLeft: () => set((s) => ({ isSidebarLeftOpen: !s.isSidebarLeftOpen })),
      toggleSidebarRight: () => set((s) => ({ isSidebarRightOpen: !s.isSidebarRightOpen })),
      setSidebarLeft: (open) => set({ isSidebarLeftOpen: open }),
      setSidebarRight: (open) => set({ isSidebarRightOpen: open }),
      setShowSearch: (show) => set({ showSearch: show }),
      setSearch: (search) =>
        set((s) => ({ search: { ...s.search, ...search } })),
      setWordStats: (stats) => set({ wordStats: stats }),
      setCurrentHeading: (heading) => set({ currentHeading: heading }),
      resetSearch: () => set({ search: defaultSearchState }),
    }),
    {
      name: 'zwrite-editor-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        zoom: state.zoom,
        isSidebarLeftOpen: state.isSidebarLeftOpen,
        isSidebarRightOpen: state.isSidebarRightOpen,
      }),
    }
  )
);
