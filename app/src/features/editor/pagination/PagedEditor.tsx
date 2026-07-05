/**
 * Paged Editor — Single continuous editor with visual page breaks
 *
 * Architecture:
 * - ONE single ProseMirror EditorContent (continuous flow)
 * - PageBreakPlugin places spacer widgets AFTER the last block of each page
 * - PageBackgroundLayer renders white A4 sheets behind the content
 * - CSS mask-image clips content to page areas (hides content in gaps)
 * - Pagination computed synchronously on every editor update
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { updatePageBreakDecorations } from './PageBreakPlugin';
import { PageBackgroundLayer } from './PageBackgroundLayer';
import { computePagination, type PaginationResult } from './computePagination';

interface Props {
  editor: Editor | null;
  topMarginMm: number;
  bottomMarginMm: number;
  leftMarginMm: number;
  rightMarginMm: number;
  pageBorder?: { enabled: boolean; width: number; style: string; color: string } | null;
  onPageCountChange?: (count: number) => void;
}

export function PagedEditor({
  editor,
  topMarginMm,
  bottomMarginMm,
  leftMarginMm,
  rightMarginMm,
  pageBorder,
  onPageCountChange,
}: Props) {
  const paginationRef = useRef<PaginationResult>(computePagination(
    editor, topMarginMm, bottomMarginMm
  ));
  const lastReportedCountRef = useRef(1);

  const syncPagination = useCallback(() => {
    if (!editor?.view) return;
    const pagination = computePagination(editor, topMarginMm, bottomMarginMm);
    paginationRef.current = pagination;
    updatePageBreakDecorations(editor.view, pagination);
    if (pagination.pageCount !== lastReportedCountRef.current) {
      lastReportedCountRef.current = pagination.pageCount;
      onPageCountChange?.(pagination.pageCount);
    }
  }, [editor, topMarginMm, bottomMarginMm, onPageCountChange]);

  // Editor update — strictly gated on content changes
  useEffect(() => {
    if (!editor) return;
    let microQueued = false;
    const handler = ({ transaction }: { transaction: any }) => {
      // DONT recalculate if this update didn't change the document (e.g. just a selection change or our own decoration update)
      if (!transaction.docChanged) return;
      if (transaction.getMeta('pageBreakPlugin')) return; // Explicitly skip our own decoration plugin

      if (microQueued) return;
      microQueued = true;
      queueMicrotask(() => {
        microQueued = false;
        syncPagination();
      });
    };
    editor.on('update', handler);
    const initTimer = setTimeout(syncPagination, 300);
    return () => { editor.off('update', handler); clearTimeout(initTimer); };
  }, [editor, syncPagination]);

  // Margin changes
  useEffect(() => {
    const timer = setTimeout(syncPagination, 100);
    return () => clearTimeout(timer);
  }, [topMarginMm, bottomMarginMm, leftMarginMm, rightMarginMm, syncPagination]);

  // Before print: force fresh pagination so breaks align with current content
  useEffect(() => {
    const handler = () => syncPagination();
    window.addEventListener('beforeprint', handler);
    return () => window.removeEventListener('beforeprint', handler);
  }, [syncPagination]);

  const { pageCount, pageHeight, pageGap, pageWidth } = paginationRef.current;
  const totalHeight = pageCount * pageHeight + (pageCount - 1) * pageGap;

  // CSS mask that clips content to page areas only (hides content in gaps)
  const maskStyle = useMemo(() => {
    if (pageCount <= 1) return undefined;
    // Build a mask gradient: visible on pages, hidden in gaps
    const stops: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      const pageStart = i * (pageHeight + pageGap);
      const pageEnd = pageStart + pageHeight;
      const gapEnd = pageEnd + pageGap;
      stops.push(`black ${pageStart}px`, `black ${pageEnd}px`);
      if (i < pageCount - 1) {
        stops.push(`transparent ${pageEnd}px`, `transparent ${gapEnd}px`);
      }
    }
    return `linear-gradient(to bottom, ${stops.join(', ')})`;
  }, [pageCount, pageHeight, pageGap]);

  return (
    <div
      className="paged-editor-wrapper"
      style={{
        position: 'relative',
        width: `${pageWidth}px`,
        minHeight: `${totalHeight}px`,
        margin: '0 auto',
      }}
    >
      <PageBackgroundLayer
        pageCount={pageCount}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        pageGap={pageGap}
        pageBorder={pageBorder}
      />

      <div
        className="paged-editor-content"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: `${topMarginMm}mm ${rightMarginMm}mm ${bottomMarginMm}mm ${leftMarginMm}mm`,
          minHeight: `${pageHeight}px`,
          overflow: 'hidden',
          ...(maskStyle ? {
            WebkitMaskImage: maskStyle,
            WebkitMaskSize: '100% 100%',
            maskImage: maskStyle,
            maskSize: '100% 100%',
          } : {}),
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
