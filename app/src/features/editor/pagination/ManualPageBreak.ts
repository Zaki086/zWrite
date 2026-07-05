import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    manualPageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const ManualPageBreak = Node.create({
  name: 'pageBreak',

  group: 'block',

  inline: false,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'page-break',
        class: 'page-break-indicator my-4 flex items-center justify-center border-t-2 border-dashed border-primary/50 relative before:content-["Page_Break"] before:absolute before:text-xs before:text-primary/70 before:bg-background before:px-2 select-none',
      }),
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({ type: this.name })
            .run();
        },
    };
  },
});
