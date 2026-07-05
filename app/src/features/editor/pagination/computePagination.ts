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
  endPos: number;
  el: HTMLElement;
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

  const blocks: PageBlock[] = [];
  let cumulative = 0;
  let blockIndex = 0;

  function traverse(node: any, pos: number, depth: number = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}traverse: pos=${pos}, type=${node.type.name}`);
    if (
      node.type.name === 'bulletList' ||
      node.type.name === 'orderedList' ||
      node.type.name === 'table'
    ) {
      console.log(`${indent}-> ENTERING CONTAINER: ${node.type.name}`);
      // Descend into container children (<li>, <tr>)
      node.forEach((child: any, offset: number) => {
        traverse(child, pos + 1 + offset, depth + 1);
      });
    } else {
      // Splittable unit or standard top-level block
      let el = editor!.view.nodeDOM(pos) as HTMLElement;
      
      if (!el || el.nodeType !== 1) {
        try {
          const domPos = editor!.view.domAtPos(pos);
          if (domPos && domPos.node && domPos.node.nodeType === 1) {
            const child = domPos.node.childNodes[domPos.offset];
            if (child && child.nodeType === 1) {
              el = child as HTMLElement;
            } else {
              el = domPos.node as HTMLElement;
            }
          }
        } catch (e) {
          console.error('Error resolving DOM node at pos', pos, e);
        }
      }

      console.log(`${indent}-> nodeDOM/domAtPos(${pos}) =`, el ? el.nodeName : 'NULL');
      
      if (el && el.nodeType === 1) {
        // Strict Filtering: Ignore any injected widgets, spacers, or background elements
        if (
          el.classList.contains('page-break-spacer') ||
          el.classList.contains('ProseMirror-widget') ||
          el.classList.contains('page-background') ||
          el.hasAttribute('data-page-end')
        ) {
          console.log(`${indent}-> IGNORED non-content block`);
          return;
        }

        const rect = el.getBoundingClientRect();
        blocks.push({
          blockIndex,
          height: rect.height,
          offset: cumulative,
          page: 0,
          endPos: pos + node.nodeSize,
          el,
        });
        cumulative += rect.height;
        blockIndex++;
      } else {
        console.log(`${indent}-> SKIPPED block (no valid DOM element)`);
      }
    }
  }

  editor.state.doc.forEach((node, offset) => {
    traverse(node, offset);
  });

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
    const isManualBreak = b.el.getAttribute('data-type') === 'page-break';

    if ((currentPageUsed > 0 && currentPageUsed + b.height > pageContentH) || isManualBreak) {
      currentPage++;
      currentPageUsed = 0;
      if (isManualBreak) {
          // The page break block itself goes on the new page, taking 0 height effectively (or its natural height)
          b.page = currentPage;
          currentPageUsed += b.height;
          continue;
      }
    }
    b.page = currentPage;
    currentPageUsed += b.height;
  }

  const pageCount = blocks.length === 0 ? 1 : currentPage + 1;
  console.log(`computePagination complete: generated ${blocks.length} blocks over ${pageCount} pages`);

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
