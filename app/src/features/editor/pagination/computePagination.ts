import type { Editor } from '@tiptap/react';

const MM_TO_PX = 3.779527559;
const A4_W_MM = 210;
const A4_H_MM = 297;
const PAGE_GAP = 24;

export interface PageBlock {
  blockIndex: number;
  height: number;
  offset: number;
  page: number;
}

export interface PaginationResult {
  blocks: PageBlock[];
  pageCount: number;
  pageContentHeight: number;
  pageHeight: number;
  pageGap: number;
  pageWidth: number;
}

/**
 * Synchronously measure DOM block heights and compute page assignments.
 * This is called directly from editor.on('update') — no React state, no hooks.
 */
export function computePagination(
  editor: Editor | null,
  topMarginMm: number,
  bottomMarginMm: number
): PaginationResult {
  if (!editor?.view) {
    return emptyResult(topMarginMm, bottomMarginMm);
  }

  const dom = editor.view.dom as HTMLElement;
  if (!dom) {
    return emptyResult(topMarginMm, bottomMarginMm);
  }

  // Measure every top-level child
  const children = Array.from(dom.children);
  const blocks: PageBlock[] = [];
  let cumulative = 0;

  for (let i = 0; i < children.length; i++) {
    const el = children[i] as HTMLElement;
    const rect = el.getBoundingClientRect();
    blocks.push({
      blockIndex: i,
      height: rect.height,
      offset: cumulative,
      page: 0,
    });
    cumulative += rect.height;
  }

  const pageContentH = (A4_H_MM - topMarginMm - bottomMarginMm) * MM_TO_PX;
  const pageH = A4_H_MM * MM_TO_PX;
  const pageW = A4_W_MM * MM_TO_PX;

  if (pageContentH <= 0) {
    return emptyResult(topMarginMm, bottomMarginMm);
  }

  // Greedy block-to-page assignment
  let currentPage = 0;
  let currentPageUsed = 0;
  for (const b of blocks) {
    if (currentPageUsed > 0 && currentPageUsed + b.height > pageContentH) {
      currentPage++;
      currentPageUsed = 0;
    }
    b.page = currentPage;
    currentPageUsed += b.height;
  }

  const pageCount = blocks.length === 0 ? 1 : currentPage + 1;

  return { blocks, pageCount, pageContentHeight: pageContentH, pageHeight: pageH, pageGap: PAGE_GAP, pageWidth: pageW };
}

function emptyResult(topM: number, botM: number): PaginationResult {
  const pageH = A4_H_MM * MM_TO_PX;
  return {
    blocks: [],
    pageCount: 1,
    pageContentHeight: (A4_H_MM - topM - botM) * MM_TO_PX,
    pageHeight: pageH,
    pageGap: PAGE_GAP,
    pageWidth: A4_W_MM * MM_TO_PX,
  };
}
