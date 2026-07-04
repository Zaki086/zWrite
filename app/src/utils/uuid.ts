/**
 * Generate a UUID v4 with fallback for non-secure contexts.
 * crypto.randomUUID() throws in http:// (non-secure) origins.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to manual implementation
    }
  }
  // Manual UUID v4 implementation (RFC 4122)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
