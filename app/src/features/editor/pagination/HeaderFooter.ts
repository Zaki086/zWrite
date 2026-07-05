import { Node, mergeAttributes } from '@tiptap/core';

export const DocumentHeader = Node.create({
  name: 'documentHeader',
  group: 'block',
  content: 'inline*',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'header[data-type="document-header"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'header',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'document-header',
        class: 'document-header absolute left-0 right-0 top-0 opacity-50 focus-within:opacity-100 hover:opacity-100 transition-opacity border-b border-dashed border-border pb-2 mb-4',
        style: 'transform: translateY(-100%); padding-bottom: 8px;'
      }),
      0,
    ];
  },
});

export const DocumentFooter = Node.create({
  name: 'documentFooter',
  group: 'block',
  content: 'inline*',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'footer[data-type="document-footer"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'footer',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'document-footer',
        class: 'document-footer absolute left-0 right-0 bottom-0 opacity-50 focus-within:opacity-100 hover:opacity-100 transition-opacity border-t border-dashed border-border pt-2 mt-4',
        style: 'transform: translateY(100%); padding-top: 8px;'
      }),
      0,
    ];
  },
});
