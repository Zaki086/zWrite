import JSZip from 'jszip';
import type { JSONContent } from '@tiptap/react';

export async function parseDocx(file: File): Promise<JSONContent> {
  const zip = await JSZip.loadAsync(file);

  // 1. Parse rels to map images
  const relsXmlText = await zip.file('word/_rels/document.xml.rels')?.async('text');
  const relMap = new Map<string, string>(); // Id -> Target
  if (relsXmlText) {
    const relsDoc = new DOMParser().parseFromString(relsXmlText, 'application/xml');
    const rels = relsDoc.getElementsByTagName('Relationship');
    for (let i = 0; i < rels.length; i++) {
      const id = rels[i].getAttribute('Id');
      const target = rels[i].getAttribute('Target'); // e.g. media/image1.png
      if (id && target) {
        relMap.set(id, target);
      }
    }
  }

  // 2. Preload all images from media/ as base64
  const imageMap = new Map<string, string>(); // Target -> Base64 Data URI
  const mediaFiles = Object.keys(zip.files).filter(k => k.startsWith('word/media/'));
  for (const mediaFile of mediaFiles) {
    const ext = mediaFile.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : 'image/png';
    const base64 = await zip.file(mediaFile)?.async('base64');
    if (base64) {
      // Remove 'word/' from target path because target in rels is usually 'media/...'
      const targetKey = mediaFile.replace('word/', '');
      imageMap.set(targetKey, `data:${mime};base64,${base64}`);
    }
  }

  // 3. Parse document.xml
  const documentXmlText = await zip.file('word/document.xml')?.async('text');
  if (!documentXmlText) {
    throw new Error('Invalid DOCX: missing word/document.xml');
  }
  const doc = new DOMParser().parseFromString(documentXmlText, 'application/xml');

  // Helper to extract text styles
  const parseRunProperties = (rPr: Element): { marks: any[] } => {
    const marks: any[] = [];
    if (rPr.getElementsByTagName('w:b').length > 0) marks.push({ type: 'bold' });
    if (rPr.getElementsByTagName('w:i').length > 0) marks.push({ type: 'italic' });
    if (rPr.getElementsByTagName('w:strike').length > 0) marks.push({ type: 'strike' });
    if (rPr.getElementsByTagName('w:u').length > 0) marks.push({ type: 'underline' });

    const color = rPr.getElementsByTagName('w:color')[0];
    if (color) {
      const val = color.getAttribute('w:val');
      if (val && val !== 'auto') {
        marks.push({ type: 'textStyle', attrs: { color: `#${val}` } });
      }
    }

    const highlight = rPr.getElementsByTagName('w:highlight')[0];
    if (highlight) {
      const val = highlight.getAttribute('w:val');
      if (val && val !== 'none') {
        // Map word colors to hex if needed, simple mapping here
        const colors: Record<string, string> = { yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff', red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000', darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080', lightGray: '#c0c0c0', black: '#000000' };
        marks.push({ type: 'highlight', attrs: { color: colors[val] || val } });
      }
    }
    return { marks };
  };

  // Traversal
  const parseNode = (node: Element): JSONContent | JSONContent[] | null => {
    if (node.tagName === 'w:p') {
      const pPr = node.getElementsByTagName('w:pPr')[0];
      let isHeading = false;
      let level = 1;
      let align = 'left';

      if (pPr) {
        const pStyle = pPr.getElementsByTagName('w:pStyle')[0];
        if (pStyle) {
          const val = pStyle.getAttribute('w:val');
          if (val?.startsWith('Heading')) {
            isHeading = true;
            level = parseInt(val.replace('Heading', ''), 10) || 1;
          }
        }
        const jc = pPr.getElementsByTagName('w:jc')[0];
        if (jc) {
          const val = jc.getAttribute('w:val');
          if (val === 'center' || val === 'right' || val === 'justify') {
            align = val;
          }
        }
      }

      const content: JSONContent[] = [];
      const children = Array.from(node.childNodes) as Element[];
      for (const child of children) {
        const parsed = parseNode(child);
        if (Array.isArray(parsed)) content.push(...parsed);
        else if (parsed) content.push(parsed);
      }

      // Check for page break in paragraph properties
      let hasPageBreak = false;
      if (pPr && pPr.getElementsByTagName('w:pageBreakBefore').length > 0) {
          hasPageBreak = true;
      }
      // Or in run elements (w:br w:type="page") handled below

      const blockNode = {
        type: isHeading ? 'heading' : 'paragraph',
        attrs: isHeading ? { level, textAlign: align } : { textAlign: align },
        content: content.length > 0 ? content : undefined,
      };
      
      if (hasPageBreak) {
          return [{ type: 'pageBreak' }, blockNode];
      }
      return blockNode;
    }

    if (node.tagName === 'w:r') {
      const rPr = node.getElementsByTagName('w:rPr')[0];
      const { marks } = rPr ? parseRunProperties(rPr) : { marks: [] };
      const content: JSONContent[] = [];

      const children = Array.from(node.childNodes) as Element[];
      for (const child of children) {
        if (child.tagName === 'w:t') {
          content.push({
            type: 'text',
            text: child.textContent || '',
            marks: marks.length > 0 ? marks : undefined,
          });
        } else if (child.tagName === 'w:br') {
          const type = child.getAttribute('w:type');
          if (type === 'page') {
             // Will return pageBreak node
             content.push({ type: 'pageBreak' });
          } else {
             content.push({ type: 'hardBreak' });
          }
        } else if (child.tagName === 'w:drawing') {
          const blip = child.getElementsByTagName('a:blip')[0];
          if (blip) {
            const embedId = blip.getAttribute('r:embed');
            if (embedId) {
              const target = relMap.get(embedId);
              if (target) {
                const src = imageMap.get(target);
                if (src) {
                  content.push({ type: 'image', attrs: { src } });
                }
              }
            }
          }
        }
      }
      return content;
    }

    if (node.tagName === 'w:tbl') {
      const content: JSONContent[] = [];
      const rows = Array.from(node.childNodes).filter(n => (n as Element).tagName === 'w:tr') as Element[];
      for (const row of rows) {
        const rowContent: JSONContent[] = [];
        const cells = Array.from(row.childNodes).filter(n => (n as Element).tagName === 'w:tc') as Element[];
        for (const cell of cells) {
          const cellContent: JSONContent[] = [];
          const cellChildren = Array.from(cell.childNodes) as Element[];
          for (const cc of cellChildren) {
            const parsed = parseNode(cc);
            if (Array.isArray(parsed)) cellContent.push(...parsed);
            else if (parsed) cellContent.push(parsed);
          }
          // Tiptap table cells MUST have at least one block element
          if (cellContent.length === 0) {
            cellContent.push({ type: 'paragraph' });
          }
          rowContent.push({
            type: 'tableCell',
            content: cellContent,
          });
        }
        content.push({ type: 'tableRow', content: rowContent });
      }
      return { type: 'table', content };
    }

    return null;
  };

  const body = doc.getElementsByTagName('w:body')[0];
  const finalContent: JSONContent[] = [];
  if (body) {
    const children = Array.from(body.childNodes) as Element[];
    for (const child of children) {
      const parsed = parseNode(child);
      if (Array.isArray(parsed)) finalContent.push(...parsed);
      else if (parsed) finalContent.push(parsed);
    }
  }

  // Tiptap needs at least one empty paragraph if the document is empty
  if (finalContent.length === 0) {
    finalContent.push({ type: 'paragraph' });
  }

  return { type: 'doc', content: finalContent };
}
