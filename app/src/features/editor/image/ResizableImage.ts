import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from './ResizableImageView';

/* Module augmentation for ResizableImage commands */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: Partial<ResizableImageAttributes>) => ReturnType;
      updateImageAttributes: (attrs: Partial<ResizableImageAttributes>) => ReturnType;
    };
  }
}

export interface ResizableImageOptions {
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

export interface ResizableImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  layout?: 'block-center' | 'float-left' | 'float-right';
}

/**
 * Custom Image extension with a React NodeView that provides:
 * - Drag-to-resize handles
 * - Alignment control (left/center/right)
 * - Wrap mode (inline / block)
 * - Width/height persisted as node attributes
 */
export const ResizableImage = Node.create<ResizableImageOptions>({
  name: 'image',
  group: 'inline', // Allow inline placement; NodeView can make it block-like
  draggable: true,
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.getAttribute('width');
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const h = element.getAttribute('height');
          return h ? parseInt(h, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => {
          const className = element.className || '';
          if (className.includes('align-left')) return 'left';
          if (className.includes('align-right')) return 'right';
          return 'center';
        },
        renderHTML: (attributes) => {
          return { class: `image-align-${attributes.align || 'center'}` };
        },
      },
      layout: {
        default: 'block-center',
        parseHTML: (element) => {
          const className = element.className || '';
          if (className.includes('img-layout-float-left')) return 'float-left';
          if (className.includes('img-layout-float-right')) return 'float-right';
          return 'block-center';
        },
        renderHTML: (attributes) => {
          return { class: `img-layout-${attributes.layout || 'block-center'}` };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const element = dom as HTMLImageElement;
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: element.width || null,
            height: element.height || null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setImage:
        (options: Partial<ResizableImageAttributes>) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt,
              title: options.title,
              width: options.width || 400,
              height: options.height || null,
              layout: options.layout || 'block-center',
            },
          });
        },
      updateImageAttributes:
        (attrs: Partial<ResizableImageAttributes>) =>
        ({ chain }: { chain: any }) => {
          return chain().updateAttributes(this.name, attrs).run();
        },
    } as any;
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
