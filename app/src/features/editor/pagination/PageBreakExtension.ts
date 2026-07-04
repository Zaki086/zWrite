/**
 * Tiptap Extension: Page Break Decorations
 *
 * Wraps the ProseMirror pageBreakPlugin so it can be registered
 * as a standard Tiptap extension. React code updates decorations
 * via the exported updatePageBreakDecorations() function.
 */
import { Extension } from '@tiptap/core';
import { createPageBreakPlugin } from './PageBreakPlugin';

export const PageBreakExtension = Extension.create({
  name: 'pageBreakDecorations',

  addProseMirrorPlugins() {
    return [createPageBreakPlugin()];
  },
});
