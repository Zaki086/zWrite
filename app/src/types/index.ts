export interface DocumentMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  charCount: number;
  pageCount: number;
  thumbnail?: string;
}

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface PageSettings {
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  orientation: 'portrait' | 'landscape';
  pageBorder: {
    enabled: boolean;
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
    color: string;
  };
}

export interface EditorState {
  zoom: number;
  isFocusMode: boolean;
  isSidebarLeftOpen: boolean;
  isSidebarRightOpen: boolean;
  showSearch: boolean;
}

export interface SearchState {
  query: string;
  replaceWith: string;
  matches: number;
  currentMatch: number;
  isReplaceMode: boolean;
}

export interface OutlineItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export interface WordStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  sentences: number;
  pages: number;
  readingTime: number;
}

export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
  caption?: string;
}

export interface TemplateData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'professional' | 'personal' | 'business';
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  shortcut?: string;
  action: () => void;
}
