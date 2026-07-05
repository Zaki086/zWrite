/**
 * PageBreakPlugin.ts — ProseMirror Plugin: Page Break Decorations
 *
 * Consumes the output of computePageLayout (PageLayoutResult) directly.
 * Places one spacer widget after flatUnits[pageBreaks[i]] for each page break.
 *
 * Critically: this plugin performs NO second traversal of the document.
 * All positions come directly from the flatUnits[] array built by
 * computePageLayout. There is no independent index mapping to maintain.
 */
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { PageLayoutResult } from './computePagination';

export const pageBreakPluginKey = new PluginKey<DecorationSet>('pageBreakPlugin');

export function createPageBreakPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: pageBreakPluginKey,

    state: {
      init() { return DecorationSet.empty; },
      apply(tr, value) {
        // Always map existing decorations through any document changes first
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

function buildDecorations(doc: any, pagination: PageLayoutResult): DecorationSet {
  const { flatUnits, pageBreaks, pageCount, pageContentHeight, pageGap } = pagination;
  const decorations: Decoration[] = [];

  if (pageCount <= 1 || pageBreaks.length === 0 || flatUnits.length === 0) {
    return DecorationSet.empty;
  }

  // For each page break index, insert a spacer widget AFTER the unit at that index.
  // The spacer height fills the remaining space on the current page plus the gap
  // to the next page, so content below it visually starts at the top of the next page.
  for (let bi = 0; bi < pageBreaks.length; bi++) {
    const unitIndex = pageBreaks[bi];
    const unit = flatUnits[unitIndex];
    if (!unit) continue;

    // Calculate how much vertical space is left on this page by summing heights
    // of all units on the same page (units between the previous break and this one).
    const prevBreakUnitIndex = bi === 0 ? -1 : pageBreaks[bi - 1];
    let pageUsedHeight = 0;
    for (let j = prevBreakUnitIndex + 1; j <= unitIndex; j++) {
      if (flatUnits[j]) pageUsedHeight += flatUnits[j].height;
    }

    const remaining = Math.max(0, pageContentHeight - pageUsedHeight);
    const spacerHeight = remaining + pageGap;

    if (spacerHeight <= pageGap) continue; // Nothing meaningful to add

    const widget = document.createElement('div');
    widget.className = 'page-break-spacer ProseMirror-widget';
    widget.style.height = `${spacerHeight}px`;
    widget.style.pointerEvents = 'none';
    widget.style.userSelect = 'none';
    widget.setAttribute('contenteditable', 'false');
    widget.setAttribute('aria-hidden', 'true');
    widget.setAttribute('data-page-end', String(bi + 1));

    // Place widget directly at unit.endPos — read straight from the flat array.
    // No second traversal, no index lookup against an independently-built structure.
    decorations.push(
      Decoration.widget(unit.endPos, () => widget, {
        side: 1,           // Place after the node at endPos
        key: `page-end-${bi}`,
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

export function updatePageBreakDecorations(
  view: any,
  pagination: PageLayoutResult
): void {
  if (!view) return;
  const tr = view.state.tr;
  tr.setMeta(pageBreakPluginKey, { pagination });
  view.dispatch(tr);
}
