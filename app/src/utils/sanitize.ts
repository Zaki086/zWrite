import DOMPurify from 'dompurify';

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote',
    'pre', 'code',
    'a', 'hr',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'span', 'div',
    'sub', 'sup',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'style',
    'data-*', 'width', 'height', 'colspan', 'rowspan',
    'align', 'bgcolor', 'color',
  ],
  ALLOW_DATA_ATTR: true,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true,
};

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as string;
}

export function stripDangerousContent(html: string): string {
  const config = {
    ...PURIFY_CONFIG,
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
  };
  return DOMPurify.sanitize(html, config) as string;
}

export function isValidImageType(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(mimeType);
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  if (!isValidImageType(file.type)) {
    return { valid: false, error: 'Unsupported image format. Use JPEG, PNG, GIF, WebP, or SVG' };
  }
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Image must be under 5MB' };
  }
  return { valid: true };
}

export async function resizeImageIfNeeded(
  file: File,
  maxDimension = 2000
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxDimension && img.height <= maxDimension) {
        resolve(file);
        return;
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      let { width, height } = img;
      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        },
        file.type,
        0.85
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
