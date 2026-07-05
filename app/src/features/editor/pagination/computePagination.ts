/**
 * computePagination.ts — Single-pass pagination engine
 *
 * Architecture (windoc-inspired concept, ProseMirror-native implementation):
 *
 * 1. ONE traversal of the ProseMirror doc builds a flat FlatUnit[] array.
 *    Every leaf-level breakable unit (paragraph, listItem, tableRow, image, etc.)
 *    gets one entry with its { pos, endPos, el, height }.
 *    Container nodes (bulletList, orderedList, table) are NEVER entries —
 *    they are expanded into their children in-place.
 *
 * 2. Immediately after measuring, a greedy height accumulation runs over the
 *    SAME flat array in order, assigning page boundaries and producing a
 *    pageBreaks[] of indices into flatUnits.
 *
 * 3. PageBreakPlugin reads pageBreaks directly — no second doc traversal,
 *    no index re-mapping. Desync is structurally impossible.
 */

import type { Editor } from '@tiptap/react';

const MM_TO_PX = 3.779527559;
const A4_W_MM = 210;
const A4_H_MM = 297;
const PAGE_GAP = 24;

/** One leaf-level breakable unit in document order */
export interface FlatUnit {
  pos: number;           // ProseMirror position of node start
  endPos: number;        // ProseMirror position of node end (pos + node.nodeSize)
  el: HTMLElement;       // Resolved DOM element for this unit
  height: number;        // Rendered height in px (getBoundingClientRect)
  isManualBreak: boolean; // true if this is a data-type="page-break" node
}

export interface PageLayoutResult {
  flatUnits: FlatUnit[];
  pageBreaks: number[];   // Indices into flatUnits: "spacer goes AFTER flatUnits[i]"
  pageCount: number;
  pageContentHeight: number;
  pageHeight: number;
  pageGap: number;
  pageWidth: number;
}

// ── Legacy type aliases so callers that import PaginationResult / PageBlock keep compiling ──
export type PaginationResult = PageLayoutResult;
export type PageBlock = FlatUnit;

/**
 * Resolve the nearest HTMLElement for a ProseMirror document position.
 * Primary:  view.nodeDOM(pos)
 * Fallback: view.domAtPos(pos) → walk up to nearest element
 */
function resolveEl(view: any, pos: number): HTMLElement | null {
  // Primary path — works for most block nodes
  const nd = view.nodeDOM(pos) as Node | null;
  if (nd && nd.nodeType === 1) return nd as HTMLElement;

  // Fallback: domAtPos gives {node, offset} inside a parent
  try {
    const domPos = view.domAtPos(pos);
    if (!domPos) return null;
    let node: Node | null = domPos.node;
    if (!node) return null;
    // If we landed on a text node, walk up to the element
    if (node.nodeType !== 1) node = node.parentElement;
    if (!node || node.nodeType !== 1) return null;
    // Try the child at the given offset first
    const child = (node as HTMLElement).childNodes[domPos.offset];
    if (child && child.nodeType === 1) return child as HTMLElement;
    return node as HTMLElement;
  } catch {
    // Position may be temporarily out of range during rapid edits — ignore
    return null;
  }
}

/** Recursively flatten one ProseMirror node into FlatUnit entries */
function flattenNode(
  node: any,
  pos: number,
  view: any,
  out: FlatUnit[]
): void {
  const typeName: string = node.type.name;

  // Container types: descend, do NOT add the container itself as a unit
  if (
    typeName === 'bulletList' ||
    typeName === 'orderedList' ||
    typeName === 'table'
  ) {
    node.forEach((child: any, offset: number) => {
      flattenNode(child, pos + 1 + offset, view, out);
    });
    return;
  }

  // Every other node is a leaf unit (paragraph, heading, listItem, tableRow,
  // blockquote, codeBlock, horizontalRule, image, manualPageBreak, …)
  const el = resolveEl(view, pos);
  if (!el) return;

  // Skip injected decoration widgets / spacers — they must never be measured
  if (
    el.classList.contains('page-break-spacer') ||
    el.classList.contains('ProseMirror-widget') ||
    el.hasAttribute('data-page-end')
  ) {
    return;
  }

  out.push({
    pos,
    endPos: pos + node.nodeSize,
    el,
    height: el.getBoundingClientRect().height,
    isManualBreak: el.getAttribute('data-type') === 'page-break',
  });
}

const IS_DEV = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV;

/**
 * Single-pass page layout engine.
 *
 * Traverses the ProseMirror doc once to produce a flat list of measurable
 * units, then immediately accumulates heights greedily into pages — all in
 * one function, with one shared data structure, so the two halves can never
 * desync.
 */
export function computePageLayout(
  editor: Editor | null,
  topMarginMm: number,
  bottomMarginMm: number
): PageLayoutResult {
  const pageH = A4_H_MM * MM_TO_PX;
  const pageW = A4_W_MM * MM_TO_PX;
  const pageContentH = (A4_H_MM - topMarginMm - bottomMarginMm) * MM_TO_PX;

  const empty = (): PageLayoutResult => ({
    flatUnits: [],
    pageBreaks: [],
    pageCount: 1,
    pageContentHeight: pageContentH,
    pageHeight: pageH,
    pageGap: PAGE_GAP,
    pageWidth: pageW,
  });

  if (!editor?.view || pageContentH <= 0) return empty();

  const view = editor.view;
  const doc = editor.state.doc;

  // ── Step 1: Flatten doc into one ordered FlatUnit[] ──────────────────────
  const flatUnits: FlatUnit[] = [];
  try {
    doc.forEach((node: any, offset: number) => {
      flattenNode(node, offset, view, flatUnits);
    });
  } catch (err) {
    console.error('[pagination] Error during doc traversal:', err);
    return empty();
  }

  // ── Step 2: Greedy height accumulation → pageBreaks[] ────────────────────
  // Walk the SAME flatUnits array. When a unit would overflow, record a break
  // at the previous unit index and start a fresh running total.
  const pageBreaks: number[] = [];
  let runningHeight = 0;
  let pageCount = 1;

  for (let i = 0; i < flatUnits.length; i++) {
    const unit = flatUnits[i];

    if (unit.isManualBreak) {
      // Manual page-break node: insert spacer after the previous unit
      if (i > 0) pageBreaks.push(i - 1);
      pageCount++;
      runningHeight = 0;
      continue;
    }

    if (runningHeight > 0 && runningHeight + unit.height > pageContentH) {
      // Unit overflows current page — break before it (spacer after unit i-1)
      pageBreaks.push(i - 1);
      pageCount++;
      runningHeight = unit.height;
    } else {
      runningHeight += unit.height;
    }
  }

  if (IS_DEV) {
    console.group('[pagination] computePageLayout complete');
    console.log(`${flatUnits.length} units, ${pageCount} pages, ${pageBreaks.length} breaks`);
    console.table(
      flatUnits.map((u, i) => ({
        i,
        tag: u.el.tagName,
        pos: u.pos,
        endPos: u.endPos,
        height: Math.round(u.height),
        manual: u.isManualBreak,
      }))
    );
    console.log('pageBreaks[]:', pageBreaks, '→ endPos values:', pageBreaks.map(i => flatUnits[i]?.endPos));
    console.groupEnd();
  }

  return {
    flatUnits,
    pageBreaks,
    pageCount,
    pageContentHeight: pageContentH,
    pageHeight: pageH,
    pageGap: PAGE_GAP,
    pageWidth: pageW,
  };
}

/**
 * @deprecated Use computePageLayout. This shim keeps legacy callers compiling.
 */
export function computePagination(
  editor: Editor | null,
  topMarginMm: number,
  bottomMarginMm: number
): PageLayoutResult {
  return computePageLayout(editor, topMarginMm, bottomMarginMm);
}
