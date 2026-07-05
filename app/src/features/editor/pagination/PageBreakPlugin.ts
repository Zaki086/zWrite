/**
 * ProseMirror Plugin: Page Break Decorations
 *
 * Places spacer widgets AFTER the last block of each page (not before
 * the first block of the next page). This ensures the spacer gets
 * pushed down naturally when the preceding block grows — content
 * never flows past it into the gap.
 */
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { PaginationResult, PageBlock } from './computePagination';

export const pageBreakPluginKey = new PluginKey<DecorationSet>('pageBreakPlugin');

export function createPageBreakPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: pageBreakPluginKey,

    state: {
      init() { return DecorationSet.empty; },
      apply(tr, value) {
        let mapped = value.map(tr.mapping, tr.doc);
        const meta = tr.getMeta(pageBreakPluginKey);
        if (meta?.pagination) {
          mapped = buildDecorations(tr.doc, meta.pagination);
        }
        return mapped;
      },
    },

    props: {
      decorations(state) {
        return this.getState(state) || DecorationSet.empty;
      },
    },
  });
}

function buildDecorations(doc: any, pagination: PaginationResult): DecorationSet {
  const { blocks, pageHeight, pageGap, pageCount } = pagination;
  const decorations: Decoration[] = [];

  if (pageCount <= 1 || blocks.length === 0) {
    return DecorationSet.empty;
  }

  // Group blocks by page
  const pageMap = new Map<number, PageBlock[]>();
  for (const b of blocks) {
    const arr = pageMap.get(b.page) || [];
    arr.push(b);
    pageMap.set(b.page, arr);
  }

  // Place a spacer AFTER the last block of each page (except the last)
  for (let pageNum = 0; pageNum < pageCount - 1; pageNum++) {
    const pageBlocks = pageMap.get(pageNum);
    if (!pageBlocks || pageBlocks.length === 0) continue;

    const lastBlock = pageBlocks[pageBlocks.length - 1];

    // Height: remaining space on this page + page gap
    const firstBlock = pageBlocks[0];
    const used = lastBlock.offset + lastBlock.height - firstBlock.offset;
    const remaining = Math.max(0, pageHeight - used);
    const spacerHeight = remaining + pageGap;

    if (spacerHeight <= pageGap) continue; // No meaningful spacer needed

    const widget = document.createElement('div');
    widget.className = 'page-break-spacer';
    widget.style.height = `${spacerHeight}px`;
    widget.style.pointerEvents = 'none';
    widget.style.userSelect = 'none';
    widget.setAttribute('contenteditable', 'false');
    widget.setAttribute('aria-hidden', 'true');
    widget.setAttribute('data-page-end', String(pageNum + 1));

    // Place widget AT the end of the last block (side: 1 = after)
    decorations.push(
      Decoration.widget(lastBlock.endPos, () => widget, {
        side: 1,
        key: `page-end-${pageNum}`,
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

export function updatePageBreakDecorations(
  view: any,
  pagination: PaginationResult
): void {
  if (!view) return;
  const tr = view.state.tr;
  tr.setMeta(pageBreakPluginKey, { pagination });
  view.dispatch(tr);
}
