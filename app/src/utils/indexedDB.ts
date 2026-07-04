import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DocumentData, DocumentMetadata } from '@/types';
import { generateUUID } from '@/utils/uuid';

interface ZWriteDB extends DBSchema {
  documents: {
    key: string;
    value: DocumentData;
    indexes: { 'by-updated': number };
  };
  images: {
    key: string;
    value: { id: string; data: ArrayBuffer; type: string; size: number };
  };
}

const DB_NAME = 'zwrite-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ZWriteDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ZWriteDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ZWriteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDocument(doc: DocumentData): Promise<void> {
  const db = await getDB();
  await db.put('documents', { ...doc, updatedAt: Date.now() });
}

export async function loadDocument(id: string): Promise<DocumentData | undefined> {
  const db = await getDB();
  return db.get('documents', id);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('documents', id);
}

export async function getAllDocuments(): Promise<DocumentData[]> {
  const db = await getDB();
  return db.getAllFromIndex('documents', 'by-updated');
}

export async function getRecentDocuments(limit = 50): Promise<DocumentMetadata[]> {
  const db = await getDB();
  const docs = await db.getAllFromIndex('documents', 'by-updated');
  return docs
    .reverse()
    .slice(0, limit)
    .map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      wordCount: countWords(d.content),
      charCount: d.content.length,
      pageCount: estimatePages(d.content),
    }));
}

export async function duplicateDocument(id: string): Promise<DocumentData | null> {
  const db = await getDB();
  const doc = await db.get('documents', id);
  if (!doc) return null;
  const newDoc: DocumentData = {
    ...doc,
    id: generateUUID(),
    title: `${doc.title} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.put('documents', newDoc);
  return newDoc;
}

export async function saveImage(id: string, data: ArrayBuffer, type: string): Promise<void> {
  const db = await getDB();
  await db.put('images', { id, data, type, size: data.byteLength });
}

export async function loadImage(id: string): Promise<{ data: ArrayBuffer; type: string } | undefined> {
  const db = await getDB();
  const img = await db.get('images', id);
  if (!img) return undefined;
  return { data: img.data, type: img.type };
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('images', id);
}

export async function exportAllData(): Promise<Blob> {
  const db = await getDB();
  const docs = await db.getAll('documents');
  const images = await db.getAll('images');
  const data = { documents: docs, images, exportedAt: Date.now() };
  return new Blob([JSON.stringify(data, (_key, value) => {
    if (value instanceof ArrayBuffer) {
      return Array.from(new Uint8Array(value));
    }
    return value;
  })], { type: 'application/json' });
}

function countWords(content: string): number {
  if (!content) return 0;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const text = doc.body.textContent || '';
    return text.trim().split(/\s+/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

function estimatePages(content: string): number {
  const words = countWords(content);
  return Math.max(1, Math.ceil(words / 500));
}
