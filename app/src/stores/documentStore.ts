import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DocumentMetadata, DocumentData, PageSettings } from '@/types';
import { generateUUID } from '@/utils/uuid';

interface DocumentStore {
  // Current document
  currentDocument: DocumentData | null;
  documentTitle: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: number | null;

  // Document list
  recentDocuments: DocumentMetadata[];

  // Page settings
  pageSettings: PageSettings;

  // Actions
  setCurrentDocument: (doc: DocumentData | null) => void;
  setDocumentTitle: (title: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSaved: (time: number | null) => void;
  updateContent: (content: string) => void;
  setRecentDocuments: (docs: DocumentMetadata[]) => void;
  addRecentDocument: (doc: DocumentMetadata) => void;
  removeRecentDocument: (id: string) => void;
  updateRecentDocument: (doc: DocumentMetadata) => void;
  setPageSettings: (settings: Partial<PageSettings>) => void;
  createNewDocument: () => DocumentData;
}

const defaultPageSettings: PageSettings = {
  margins: { top: 25, right: 25, bottom: 25, left: 25 },
  orientation: 'portrait',
  pageBorder: { enabled: false, width: 1, style: 'solid', color: '#000000' },
};

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      currentDocument: null,
      documentTitle: 'Untitled Document',
      isDirty: false,
      isSaving: false,
      lastSaved: null,
      recentDocuments: [],
      pageSettings: defaultPageSettings,

      setCurrentDocument: (doc) =>
        set({
          currentDocument: doc,
          documentTitle: doc?.title || 'Untitled Document',
          isDirty: false,
        }),

      setDocumentTitle: (title) => {
        set({ documentTitle: title, isDirty: true });
        const current = get().currentDocument;
        if (current) {
          current.title = title;
        }
      },

      setIsDirty: (dirty) => set({ isDirty: dirty }),
      setIsSaving: (saving) => set({ isSaving: saving }),
      setLastSaved: (time) => set({ lastSaved: time }),

      updateContent: (content) => {
        const current = get().currentDocument;
        if (current) {
          current.content = content;
        }
        set({ isDirty: true });
      },

      setRecentDocuments: (docs) => set({ recentDocuments: docs }),

      addRecentDocument: (doc) =>
        set((state) => ({
          recentDocuments: [doc, ...state.recentDocuments.filter((d) => d.id !== doc.id)].slice(0, 50),
        })),

      removeRecentDocument: (id) =>
        set((state) => ({
          recentDocuments: state.recentDocuments.filter((d) => d.id !== id),
        })),

      updateRecentDocument: (doc) =>
        set((state) => ({
          recentDocuments: state.recentDocuments.map((d) => (d.id === doc.id ? doc : d)),
        })),

      setPageSettings: (settings) =>
        set((state) => ({
          pageSettings: { ...state.pageSettings, ...settings },
        })),

      createNewDocument: () => {
        const newDoc: DocumentData = {
          id: generateUUID(),
          title: 'Untitled Document',
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set({
          currentDocument: newDoc,
          documentTitle: newDoc.title,
          isDirty: false,
          isSaving: false,
          lastSaved: null,
        });
        return newDoc;
      },
    }),
    {
      name: 'zwrite-document-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentDocuments: state.recentDocuments,
        pageSettings: state.pageSettings,
      }),
    }
  )
);
