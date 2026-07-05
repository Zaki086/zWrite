/**
 * DOCX Export — Document-Model-Driven (from ProseMirror JSON)
 *
 * Every property is explicitly set. No Word defaults relied upon.
 * Architecture: editor.getJSON() → walk nodes → docx elements
 */

import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ImageRun,
  convertInchesToTwip, UnderlineType,
  Header, Footer, PageBreak,
  type FileChild,
} from 'docx';
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { PageSettings } from '@/types';

/* ===== Word defaults we explicitly enforce ===== */
const BODY_FONT = 'Calibri';
const BODY_SIZE = 24; // 12pt in half-points — was 22 (11pt), too small per user
const LINE_HEIGHT = 276; // 1.15 * 240 twips
const PARA_AFTER = 120; // 8pt in twips
const PARA_BEFORE = 0;

/* ===== Heading sizes (pt → half-points) ===== */
const H_SIZES: Record<number, number> = {
  1: 60, // 30pt
  2: 52, // 26pt
  3: 44, // 22pt
  4: 40, // 20pt
  5: 36, // 18pt
  6: 32, // 16pt
};

/* ===== Heading spacing ===== */
const H_SPACING: Record<number, { before: number; after: number }> = {
  1: { before: 360, after: 200 },
  2: { before: 320, after: 160 },
  3: { before: 280, after: 120 },
  4: { before: 240, after: 100 },
  5: { before: 240, after: 80 },
  6: { before: 200, after: 80 },
};

/* ===== Color helpers ===== */
function hexColor(input: string | undefined): string | undefined {
  if (!input) return undefined;
  return input.replace('#', '').toUpperCase();
}

/* ===== Safe dimension clamp ===== */
function clampDim(v: number, min = 16, max = 576): number {
  if (!Number.isFinite(v) || v <= 0) return min;
  return Math.max(min, Math.min(max, v));
}

/* ================================================================ */
/*  PUBLIC ENTRY                                                    */
/* ================================================================ */

async function resolveImages(json: JSONContent) {
  if (json.type === 'image' && json.attrs && json.attrs.src) {
    const src = json.attrs.src;
    // We want to force it to a clean PNG data URL, even if it's already a data URL (to fix mime mismatches like webp->png)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No 2d context');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = src;
      });
      json.attrs.src = dataUrl;
    } catch (e) {
      console.warn('Failed to resolve image src:', src, e);
    }
  }
  if (json.content) {
    await Promise.all(json.content.map(resolveImages));
  }
}

export async function exportToDOCX(
  editor: Editor,
  pageSettings: PageSettings,
  title?: string,
): Promise<void> {
  // @ts-ignore
  window.__lastExportDocxArgs = { editor, pageSettings, title };
  const json = editor.getJSON();
  
  // Normalize all images to clean PNG data URIs before DOCX generation
  await resolveImages(json);

  const children = jsonToDocx(json);

  if (children.length === 0) {
    children.push(makeEmptyPara());
  }

  const m = pageSettings.margins;

  const docxDoc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: BODY_FONT,
            size: BODY_SIZE,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line: LINE_HEIGHT,
              lineRule: 'auto',
              before: PARA_BEFORE,
              after: PARA_AFTER,
            },
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(m.top / 25.4),
            right: convertInchesToTwip(m.right / 25.4),
            bottom: convertInchesToTwip(m.bottom / 25.4),
            left: convertInchesToTwip(m.left / 25.4),
          },
          size: pageSettings.orientation === 'landscape'
            ? { orientation: 'landscape', width: convertInchesToTwip(11.69), height: convertInchesToTwip(8.27) }
            : { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
        },
      },
      headers: pageSettings.headerEnabled && pageSettings.headerText ? {
        default: new Header({
          children: [
            new Paragraph({
              children: [new TextRun({ text: pageSettings.headerText, font: BODY_FONT, size: 20, color: '000000' })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      } : undefined,
      footers: pageSettings.footerEnabled && pageSettings.footerText ? {
        default: new Footer({
          children: [
            new Paragraph({
              children: [new TextRun({ text: pageSettings.footerText, font: BODY_FONT, size: 20, color: '000000' })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      } : undefined,
      children,
    }],
  });

  const blob = await Packer.toBlob(docxDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || 'document').replace(/[^a-zA-Z0-9\-_]/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// @ts-ignore
if (typeof window !== 'undefined') window.exportToDOCX = exportToDOCX;

/* ================================================================ */
/*  JSON → DOCX                                                    */
/* ================================================================ */

function jsonToDocx(json: JSONContent): FileChild[] {
  if (!json.content) return [];
  return json.content.flatMap(nodeToDocx);
}

function nodeToDocx(node: JSONContent): FileChild[] {
  switch (node.type) {
    case 'paragraph': return [makeParagraph(node)];
    case 'heading': return [makeHeading(node)];
    case 'bulletList': return makeList(node, false);
    case 'orderedList': return makeList(node, true);
    case 'blockquote': return [makeBlockquote(node)];
    case 'codeBlock': return [makeCodeBlock(node)];
    case 'horizontalRule':
      return [new Paragraph({
        border: { bottom: { color: 'CCCCCC', space: 1, style: BorderStyle.SINGLE, size: 6 } },
        spacing: { before: 120, after: 120 },
      })];
    case 'table': return [makeTable(node)];
    case 'image': return [makeImage(node)];
    case 'pageBreak': return [new Paragraph({ children: [new PageBreak()] })];
    case 'doc':
    case 'listItem':
    case 'tableRow':
    case 'tableCell':
    case 'tableHeader':
      return node.content ? node.content.flatMap(nodeToDocx) : [];
    default:
      // Unknown block — try children, or wrap inline text
      if (node.content) return node.content.flatMap(nodeToDocx);
      if (node.text) return [makeParagraph({ type: 'paragraph', content: [node] })];
      return [];
  }
}

/* ================================================================ */
/*  BLOCK-LEVEL MAKERS                                              */
/* ================================================================ */

function makeParagraph(node: JSONContent): Paragraph {
  const align = node.attrs?.textAlign;
  const runs = extractRuns(node);

  return new Paragraph({
    children: runs.length ? runs : [new TextRun({ text: '', font: BODY_FONT, size: BODY_SIZE, color: '000000' })],
    alignment: align ? alignToDocx(align) : AlignmentType.LEFT,
    spacing: { line: LINE_HEIGHT, lineRule: 'auto', before: PARA_BEFORE, after: PARA_AFTER },
  });
}

function makeHeading(node: JSONContent): Paragraph {
  const level = Math.min(Math.max(node.attrs?.level || 1, 1), 6);
  const size = H_SIZES[level] || BODY_SIZE;
  const spacing = H_SPACING[level] || { before: 240, after: 120 };

  // Extract heading color from marks on child text nodes
  const headingColor = findColorInContent(node.content);
  const effectiveColor = headingColor || '000000';

  const runs = extractRuns(node, { forceSize: size, forceColor: effectiveColor, forceBold: true });

  // NOTE: Do NOT use 'heading' property — Word's default heading styles
  // override our explicit font sizes. Use explicit formatting only.
  return new Paragraph({
    children: runs.length
      ? runs
      : [new TextRun({ text: extractText(node), font: BODY_FONT, size, bold: true, color: effectiveColor })],
    spacing: { line: LINE_HEIGHT, lineRule: 'auto', before: spacing.before, after: spacing.after },
  });
}

function makeBlockquote(node: JSONContent): Paragraph {
  const runs = extractRuns(node);
  return new Paragraph({
    children: runs.length
      ? runs
      : [new TextRun({ text: extractText(node), font: BODY_FONT, size: BODY_SIZE, color: '000000', italics: true })],
    indent: { left: 720 },
    spacing: { line: LINE_HEIGHT, lineRule: 'auto', before: PARA_BEFORE, after: PARA_AFTER },
  });
}

function makeCodeBlock(node: JSONContent): Paragraph {
  const text = extractText(node);
  return new Paragraph({
    children: [new TextRun({ text, font: 'Courier New', size: 20, color: '000000' })],
    shading: { fill: 'F5F5F5' },
    spacing: { line: 276, lineRule: 'auto', before: 120, after: 120 },
  });
}

/* ================================================================ */
/*  TABLE                                                           */
/* ================================================================ */

function makeTable(node: JSONContent): Table {
  const rows: TableRow[] = [];

  for (const rowNode of (node.content || [])) {
    if (rowNode.type !== 'tableRow') continue;

    const cells: TableCell[] = [];
    for (const cellNode of (rowNode.content || [])) {
      if (cellNode.type !== 'tableCell' && cellNode.type !== 'tableHeader') continue;

      const isHeader = cellNode.type === 'tableHeader';
      const paragraphs: Paragraph[] = [];

      for (const child of (cellNode.content || [])) {
        if (child.type === 'paragraph') {
          paragraphs.push(makeParagraph(child));
        } else if (child.type?.match(/^h[1-6]$/)) {
          paragraphs.push(makeHeading(child));
        } else if (child.type === 'bulletList' || child.type === 'orderedList') {
          paragraphs.push(...makeList(child, child.type === 'orderedList'));
        } else {
          const childRuns = extractRuns(child);
          if (childRuns.length) {
            paragraphs.push(new Paragraph({
              children: childRuns,
              spacing: { line: LINE_HEIGHT, lineRule: 'auto', before: 0, after: 60 },
            }));
          }
        }
      }

      if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: '', font: BODY_FONT, size: BODY_SIZE, color: '000000' })],
          spacing: { line: LINE_HEIGHT, lineRule: 'auto', before: 0, after: 60 },
        }));
      }

      const cellOpts: any = {
        children: paragraphs,
        shading: isHeader ? { fill: 'F3F4F6' } : undefined,
        verticalAlign: 'center',
      };

      const colspan = cellNode.attrs?.colspan;
      if (colspan && colspan > 1) cellOpts.columnSpan = colspan;

      const rowspan = cellNode.attrs?.rowspan;
      if (rowspan && rowspan > 1) cellOpts.rowSpan = rowspan;

      // Cell borders
      cellOpts.borders = {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      };

      cells.push(new TableCell(cellOpts));
    }

    rows.push(new TableRow({ children: cells }));
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    },
  });
}

/* ================================================================ */
/*  LIST                                                            */
/* ================================================================ */

function makeList(node: JSONContent, ordered: boolean): Paragraph[] {
  const items: Paragraph[] = [];
  let index = 1;

  for (const li of (node.content || [])) {
    if (li.type !== 'listItem') continue;

    // Flatten all content from the list item
    const liRuns: (TextRun | ImageRun)[] = [];
    for (const child of (li.content || [])) {
      if (child.type === 'paragraph') {
        liRuns.push(...extractRuns(child));
      } else if (child.type === 'text') {
        liRuns.push(...textToRuns(child.text || '', child.marks));
      } else if (child.type === 'bulletList' || child.type === 'orderedList') {
        // Nested list — handled separately
      } else {
        liRuns.push(...extractRuns(child));
      }
    }

    const prefix = ordered ? `${index}.` : '\u2022';
    items.push(new Paragraph({
      children: [
        new TextRun({ text: `${prefix}  `, font: BODY_FONT, size: BODY_SIZE, color: '000000', bold: !ordered }),
        ...liRuns,
      ],
      indent: { left: 720 },
      spacing: { line: LINE_HEIGHT, lineRule: 'auto', before: 0, after: 60 },
    }));
    index++;

    // Handle nested lists
    for (const child of (li.content || [])) {
      if (child.type === 'bulletList' || child.type === 'orderedList') {
        items.push(...makeList(child, child.type === 'orderedList'));
      }
    }
  }

  return items;
}

/* ================================================================ */
/*  IMAGE                                                           */
/* ================================================================ */

function makeImageRun(node: JSONContent): ImageRun | TextRun {
  const src = node.attrs?.src || '';
  const alt = node.attrs?.alt || 'image';
  const width = clampDim(parseInt(node.attrs?.width) || 400);
  const height = clampDim(parseInt(node.attrs?.height) || 300, 16, 800);

  if (src.startsWith('data:')) {
    try {
      const mimeMatch = src.match(/^data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      
      const base64 = src.split(',')[1];
      const imageBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;

      let imgType: 'png' | 'jpg' | 'gif' = 'png';
      if (mime === 'image/jpeg' || mime === 'image/jpg') imgType = 'jpg';
      else if (mime === 'image/gif') imgType = 'gif';

      return new ImageRun({
        data: imageBuffer,
        transformation: { width, height },
        type: imgType,
      });
    } catch (e) {
      console.warn('Image embed failed:', e);
    }
  }

  // Explicitly return a visible warning for failed images instead of silently dropping
  return new TextRun({ text: `[Failed Image: ${alt}]`, font: BODY_FONT, size: BODY_SIZE, color: 'FF0000', bold: true });
}

function makeImage(node: JSONContent): Paragraph {
  return new Paragraph({
    children: [makeImageRun(node)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
  });
}

/* ================================================================ */
/*  INLINE RUN EXTRACTION                                           */
/* ================================================================ */

interface RunOverrides {
  forceSize?: number;
  forceColor?: string;
  forceBold?: boolean;
}

function extractRuns(node: JSONContent, overrides?: RunOverrides): (TextRun | ImageRun)[] {
  const runs: (TextRun | ImageRun)[] = [];

  for (const child of (node.content || [])) {
    if (child.type === 'text') {
      runs.push(...textToRuns(child.text || '', child.marks, overrides));
    } else if (child.type === 'hardBreak') {
      runs.push(new TextRun({ text: '', break: 1, font: BODY_FONT, size: overrides?.forceSize || BODY_SIZE, color: overrides?.forceColor || '000000' }));
    } else if (child.type === 'image') {
      runs.push(makeImageRun(child));
    } else {
      // Nested element — recurse
      runs.push(...extractRuns(child, overrides));
    }
  }

  return runs;
}

function textToRuns(text: string, marks?: JSONContent['marks'], overrides?: RunOverrides): TextRun[] {
  if (!text) return [];

  const opts: any = {
    text,
    font: BODY_FONT,
    size: overrides?.forceSize || BODY_SIZE,
    color: overrides?.forceColor || '000000',
  };

  if (overrides?.forceBold) {
    opts.bold = true;
  }

  if (marks) {
    for (const mark of marks) {
      switch (mark.type) {
        case 'bold':
          opts.bold = true;
          break;
        case 'italic':
          opts.italics = true;
          break;
        case 'underline':
          opts.underline = { type: UnderlineType.SINGLE };
          break;
        case 'strike':
          opts.strike = true;
          break;
        case 'code':
          opts.font = 'Courier New';
          opts.size = 20;
          break;
        case 'textStyle':
          if (mark.attrs?.color) {
            opts.color = hexColor(mark.attrs.color) || opts.color;
          }
          if (mark.attrs?.fontSize) {
            const v = parseFloat(mark.attrs.fontSize);
            if (!isNaN(v)) {
              if (mark.attrs.fontSize.includes('px')) opts.size = Math.round(v * 0.75 * 2);
              else if (mark.attrs.fontSize.includes('pt')) opts.size = Math.round(v * 2);
            }
          }
          break;
        case 'highlight':
          if (mark.attrs?.color) {
            opts.shading = { fill: hexColor(mark.attrs.color) || 'FFFF00' };
          }
          break;
        case 'link':
          if (mark.attrs?.href) {
            opts.style = 'Hyperlink';
            opts.color = '0563C1'; // Word hyperlink blue
          }
          break;
        case 'subscript':
          opts.subScript = true;
          break;
        case 'superscript':
          opts.superScript = true;
          break;
      }
    }
  }

  return [new TextRun(opts)];
}

/* ================================================================ */
/*  UTILITIES                                                       */
/* ================================================================ */

function extractText(node: JSONContent): string {
  if (node.type === 'text') return node.text || '';
  return (node.content || []).map(extractText).join('');
}

function findColorInContent(content?: JSONContent[]): string | undefined {
  if (!content) return undefined;
  for (const child of content) {
    if (child.type === 'text' && child.marks) {
      for (const mark of child.marks) {
        if (mark.type === 'textStyle' && mark.attrs?.color) {
          return hexColor(mark.attrs.color);
        }
      }
    }
    const nested = findColorInContent(child.content);
    if (nested) return nested;
  }
  return undefined;
}

function alignToDocx(align: string): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (align) {
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}

function makeEmptyPara(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', font: BODY_FONT, size: BODY_SIZE, color: '000000' })],
    spacing: { line: LINE_HEIGHT, lineRule: 'auto', before: PARA_BEFORE, after: PARA_AFTER },
  });
}
