import type { WordStats } from '@/types';

const READING_WPM = 200;

/**
 * Calculate word statistics from HTML content.
 * NOTE: pages is NOT calculated here (it uses a fake word-count estimate).
 * Real page count comes from EditorPage via ResizeObserver measurement.
 */
export function calculateWordStats(content: string, measuredPages?: number): WordStats {
  if (!content || content === '<p></p>') {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      paragraphs: 0,
      sentences: 0,
      pages: 0,
      readingTime: 0,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const body = doc.body;

  const text = body.textContent || '';
  const trimmed = text.trim();

  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;

  const paragraphs = body.querySelectorAll('p').length || (trimmed ? 1 : 0);

  const sentenceMatches = trimmed.match(/[^.!?]+[.!?]+/g);
  const sentences = sentenceMatches ? sentenceMatches.length : (trimmed ? 1 : 0);

  // Use real measured pages from the pagination system
  const pages = measuredPages ?? 1;
  const readingTime = Math.ceil(words / READING_WPM);

  return {
    words,
    characters,
    charactersNoSpaces,
    paragraphs,
    sentences,
    pages,
    readingTime,
  };
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
