import { useState, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AlignLeft, AlignRight, WrapText, Image } from 'lucide-react';

const MIN_WIDTH = 48;
const MIN_HEIGHT = 48;

type LayoutMode = 'block-center' | 'float-left' | 'float-right';

export function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const { src, alt, title, width, height } = node.attrs;
  const layout: LayoutMode = node.attrs.layout || 'block-center';
  const [isResizing, setIsResizing] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const displayWidth = width || 400;
  const displayHeight = height || 'auto';

  // Show toolbar when selected
  useEffect(() => {
    setShowToolbar(!!selected);
  }, [selected]);

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: imgRef.current?.clientWidth || displayWidth,
        h: imgRef.current?.clientHeight || 300,
      };

      function onMouseMove(moveEvent: MouseEvent) {
        if (!startRef.current) return;
        const dx = moveEvent.clientX - startRef.current.x;
        const dy = moveEvent.clientY - startRef.current.y;

        let newW = startRef.current.w;
        let newH = startRef.current.h;

        if (corner.includes('e')) newW = startRef.current.w + dx;
        if (corner.includes('w')) newW = startRef.current.w - dx;
        if (corner.includes('s')) newH = startRef.current.h + dy;
        if (corner.includes('n')) newH = startRef.current.h - dy;

        if (moveEvent.shiftKey && startRef.current.w > 0 && startRef.current.h > 0) {
          const ratio = startRef.current.w / startRef.current.h;
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
        }

        newW = Math.max(MIN_WIDTH, newW);
        newH = Math.max(MIN_HEIGHT, newH);

        updateAttributes({ width: Math.round(newW), height: Math.round(newH) });
      }

      function onMouseUp() {
        setIsResizing(false);
        startRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [displayWidth, updateAttributes]
  );

  const setLayout = useCallback(
    (l: LayoutMode) => updateAttributes({ layout: l }),
    [updateAttributes]
  );

  // Container class based on layout mode
  const layoutClass = `img-layout-${layout}`;

  return (
    <NodeViewWrapper
      className={`image-node-view ${layoutClass} ${selected ? 'is-selected' : ''} ${isResizing ? 'is-resizing' : ''}`}
      style={{ width: displayWidth, maxWidth: '100%' }}
      data-drag-handle
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="image-toolbar">
          <button
            onClick={() => setLayout('block-center')}
            className={layout === 'block-center' ? 'active' : ''}
            title="Centered block"
            type="button"
          >
            <Image className="w-3 h-3" />
          </button>
          <button
            onClick={() => setLayout('float-left')}
            className={layout === 'float-left' ? 'active' : ''}
            title="Float left (text wraps right)"
            type="button"
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => setLayout('float-right')}
            className={layout === 'float-right' ? 'active' : ''}
            title="Float right (text wraps left)"
            type="button"
          >
            <AlignRight className="w-3 h-3" />
          </button>
          <span className="toolbar-sep" />
          <button
            onClick={() => setLayout(layout === 'float-left' ? 'float-right' : 'float-left')}
            title="Toggle text wrap side"
            type="button"
          >
            <WrapText className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Image + Resize handles */}
      <div className="image-wrapper" style={{ position: 'relative', display: 'block', maxWidth: '100%' }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || ''}
          width={displayWidth}
          height={displayHeight !== 'auto' ? displayHeight : undefined}
          style={{
            display: 'block',
            width: displayWidth,
            height: displayHeight !== 'auto' ? displayHeight : 'auto',
            maxWidth: '100%',
            userSelect: 'none',
            pointerEvents: isResizing ? 'none' : 'auto',
          }}
          draggable={false}
        />

        {/* Resize handles */}
        {selected && (
          <>
            <div className="resize-handle nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
            <div className="resize-handle ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
            <div className="resize-handle sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
            <div className="resize-handle se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
            <div className="resize-handle n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
            <div className="resize-handle s" onMouseDown={(e) => handleResizeStart(e, 's')} />
            <div className="resize-handle e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
            <div className="resize-handle w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
