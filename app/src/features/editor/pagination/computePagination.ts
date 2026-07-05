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

/**
 * Calculates the effective bottom margin of an element, accounting for
 * basic CSS margin collapse with its last block child.
 */
function getEffectiveMarginBottom(el: HTMLElement): number {
  let margin = parseFloat(window.getComputedStyle(el).marginBottom) || 0;
  let lastChild = el.lastElementChild as HTMLElement;
  while (lastChild) {
    const style = window.getComputedStyle(lastChild);
    if (style.display !== 'block' && style.display !== 'list-item') break;
    const childMargin = parseFloat(style.marginBottom) || 0;
    margin = Math.max(margin, childMargin);
    lastChild = lastChild.lastElementChild as HTMLElement;
  }
  return margin;
}

/**
 * Calculates the effective top margin of an element, accounting for
 * basic CSS margin collapse with its first block child.
 */
function getEffectiveMarginTop(el: HTMLElement): number {
  let margin = parseFloat(window.getComputedStyle(el).marginTop) || 0;
  let firstChild = el.firstElementChild as HTMLElement;
  while (firstChild) {
    const style = window.getComputedStyle(firstChild);
    if (style.display !== 'block' && style.display !== 'list-item') break;
    const childMargin = parseFloat(style.marginTop) || 0;
    margin = Math.max(margin, childMargin);
    firstChild = firstChild.firstElementChild as HTMLElement;
  }
  return margin;
}

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
  spacerHeights: number[]; // Pre-computed perfect spacer heights for each break
  pageCount: number;
  pageContentHeight: number;
  pageHeight: number;
  pageGap: number;
  pageWidth: number;
  topMarginPx: number;    // Margin padding above content (used for spacer anchor calc)
  bottomMarginPx: number; // Margin padding below content (used for spacer anchor calc)
  /** Y-coordinate (relative to .paged-editor-content top) of the editor DOM element.
   * Used as the origin for converting getBoundingClientRect values to content-relative coords. */
  editorOriginY: number;
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
  const topMarginPx = topMarginMm * MM_TO_PX;
  const bottomMarginPx = bottomMarginMm * MM_TO_PX;
  const pageContentH = pageH - topMarginPx - bottomMarginPx;

  const empty = (): PageLayoutResult => ({
    flatUnits: [],
    pageBreaks: [],
    spacerHeights: [],
    pageCount: 1,
    pageContentHeight: pageContentH,
    pageHeight: pageH,
    pageGap: PAGE_GAP,
    pageWidth: pageW,
    topMarginPx,
    bottomMarginPx,
    editorOriginY: 0,
  });

  if (!editor?.view || pageContentH <= 0) return empty();

  const view = editor.view;
  const doc = editor.state.doc;

  // Measure editorOriginY: the Y-coordinate of the ProseMirror DOM element
  // relative to the .paged-editor-content container. This is used in PageBreakPlugin
  // to convert getBoundingClientRect values to content-div-relative coordinates.
  // (It equals topMarginPx in practice, but we measure it to avoid floating-point drift.)
  const editorDom = view.dom as HTMLElement;
  const contentDiv = editorDom.closest('.paged-editor-content') as HTMLElement | null;
  const editorOriginY = contentDiv
    ? editorDom.getBoundingClientRect().top - contentDiv.getBoundingClientRect().top
    : topMarginPx;

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

  // ── Step 2: Un-spaced Ribbon Slicing → pageBreaks[] & spacerHeights[] ──
  // Hide existing spacers to force a reflow. This allows us to measure the document
  // as a perfect, continuous ribbon, completely sidestepping margin-collapse bugs.
  const oldSpacers = editorDom.querySelectorAll('.page-break-spacer');
  oldSpacers.forEach(s => (s as HTMLElement).style.display = 'none');

  const contentDivTop = contentDiv ? contentDiv.getBoundingClientRect().top : 0;
  
  // Pre-measure all un-spaced tops and bottoms
  const unSpacedTops: number[] = new Array(flatUnits.length);
  const unSpacedBottoms: number[] = new Array(flatUnits.length);
  for (let i = 0; i < flatUnits.length; i++) {
    const rect = flatUnits[i].el.getBoundingClientRect();
    unSpacedTops[i] = rect.top - contentDivTop;
    unSpacedBottoms[i] = rect.bottom - contentDivTop;
  }

  const pageBreaks: number[] = [];
  const spacerHeights: number[] = [];
  let pageCount = 1;
  let accumulatedSpacerHeight = 0;

  for (let i = 0; i < flatUnits.length; i++) {
    const unit = flatUnits[i];
    // Check overflow using the spaced bottom (unSpacedBottom + accumulated shift)
    // Wait, the ribbon limits remain fixed because targetY also grows exactly by pageH + PAGE_GAP.
    // Yes, unSpacedBottoms[i] > topMarginPx + pageCount * pageContentH works, BUT
    // since we calculate exact targetY now, it's safer to just check actual spaced bottom against spaced limit!
    const spacedLimit = pageCount * (pageH + PAGE_GAP) - PAGE_GAP + editorOriginY;
    const actualBottom = unSpacedBottoms[i] + accumulatedSpacerHeight;

    let breakIdx = -1;

    if (unit.isManualBreak) {
      breakIdx = Math.max(0, i - 1);
    } else if (actualBottom > spacedLimit) {
      if (i === 0) continue; // Cannot break before the very first unit
      breakIdx = i - 1;
    }

    if (breakIdx !== -1) {
      // Don't insert duplicate breaks at the same index
      if (pageBreaks.length === 0 || pageBreaks[pageBreaks.length - 1] !== breakIdx) {
        pageBreaks.push(breakIdx);
        
        const breakUnit = flatUnits[breakIdx];
        const nextUnit = flatUnits[breakIdx + 1];
        
        const breakActualBottom = unSpacedBottoms[breakIdx] + accumulatedSpacerHeight;
        const targetY = pageCount * (pageH + PAGE_GAP) + editorOriginY;
        
        let spacerHeight = 0;
        if (nextUnit) {
          const p1MarginBot = getEffectiveMarginBottom(breakUnit.el);
          const p2MarginTop = getEffectiveMarginTop(nextUnit.el);
          
          spacerHeight = Math.max(0, targetY - breakActualBottom - p1MarginBot - p2MarginTop);
          
          // The new accumulated shift for all elements starting from nextUnit
          // is exactly what's needed to push nextUnit.top from its unSpaced position to targetY
          accumulatedSpacerHeight = targetY - unSpacedTops[breakIdx + 1];
        } else {
          spacerHeight = Math.max(0, targetY - breakActualBottom);
          accumulatedSpacerHeight += spacerHeight;
        }
        
        spacerHeights.push(spacerHeight);
      }
      
      pageCount++;
      
      // Re-evaluate the overflowing unit (i) against the NEW page limit.
      if (!unit.isManualBreak) {
        i--;
      }
    }
  }

  // Restore spacers so the DOM isn't left broken before React re-renders
  oldSpacers.forEach(s => (s as HTMLElement).style.display = '');

  return {
    flatUnits,
    pageBreaks,
    spacerHeights,
    pageCount,
    pageContentHeight: pageContentH,
    pageHeight: pageH,
    pageGap: PAGE_GAP,
    pageWidth: pageW,
    topMarginPx,
    bottomMarginPx,
    editorOriginY,
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
