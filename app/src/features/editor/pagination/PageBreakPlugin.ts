/**
 * PageBreakPlugin.ts — ProseMirror Plugin: Page Break Decorations
 *
 * Consumes the output of computePageLayout (PageLayoutResult) directly.
 * Places one spacer widget after flatUnits[pageBreaks[i]] for each page break.
 *
 * Critically: this plugin performs NO second traversal of the document.
 * All positions come directly from the flatUnits[] array built by computePageLayout.
 *
 * Spacer height formula — Option B (anchor-to-absolute):
 * ──────────────────────────────────────────────────────
 * Instead of accumulating relative heights (which omit CSS margins and
 * can drift due to margin-collapse, rounding, etc.), each spacer is sized
 * to snap the next page's first content unit to the EXACT Y coordinate that
 * the fixed mask/background geometry expects:
 *
 *   targetY = (breakNumber + 1) × (pageHeight + pageGap) + topMarginPx
 *             (relative to .paged-editor-content top)
 *
 *   currentY = spacer's DOM top (i.e. the bottom of the last unit on this page)
 *              (relative to .paged-editor-content top)
 *
 *   spacerHeight = targetY − currentY
 *
 * This is self-correcting: even if some height measurement was slightly off,
 * each spacer snaps the flow back to the exact fixed geometry line, preventing
 * drift from compounding across multiple pages.
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
  const {
    flatUnits, pageBreaks, spacerHeights, pageCount,
  } = pagination;
  const decorations: Decoration[] = [];

  if (pageCount <= 1 || pageBreaks.length === 0 || flatUnits.length === 0) {
    return DecorationSet.empty;
  }

  for (let bi = 0; bi < pageBreaks.length; bi++) {
    const unitIndex = pageBreaks[bi];
    const unit = flatUnits[unitIndex];
    if (!unit) continue;

    const spacerHeight = spacerHeights[bi];
    if (spacerHeight === undefined || spacerHeight < 1) continue;

    const widget = document.createElement('div');
    widget.className = 'page-break-spacer ProseMirror-widget';
    widget.style.height = `${spacerHeight}px`;
    widget.style.pointerEvents = 'none';
    widget.style.userSelect = 'none';
    widget.setAttribute('contenteditable', 'false');
    widget.setAttribute('aria-hidden', 'true');
    widget.setAttribute('data-page-end', String(bi + 1));

    // Place widget directly at unit.endPos — read straight from the flat array.
    decorations.push(
      Decoration.widget(unit.endPos, () => widget, {
        side: 1,
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
