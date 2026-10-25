/**
 * Stockage des fichiers de la GED.
 * - Mode serveur : fichiers conservés en base MySQL (API /api/files).
 * - Mode démo (sans serveur) : fichiers conservés dans IndexedDB du navigateur.
 */
import { api } from './api';
import { ALLOWED_FILE_TYPES, fileExtension, matchesSignature, validateFileMeta } from '../../shared/documents';

const DB_NAME = 'gspme-files';
const STORE = 'files';
const DEMO_QUOTA = 50 * 1024 * 1024;

export interface StoredFileInfo {
  id: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('Stockage local indisponible dans ce navigateur'));
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Contrôle côté navigateur (le serveur refait les mêmes contrôles). */
export async function checkFile(file: File): Promise<string | null> {
  const meta = validateFileMeta(file.name, file.size);
  if (meta) return meta;
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  if (!matchesSignature(fileExtension(file.name), head)) return `Le contenu de « ${file.name} » ne correspond pas à son extension.`;
  return null;
}

export const kindOf = (name: string) => ALLOWED_FILE_TYPES[fileExtension(name)]?.kind || 'AUTRE';
export const mimeOf = (name: string) => ALLOWED_FILE_TYPES[fileExtension(name)]?.mime || 'application/octet-stream';

export const fileStore = {
  async save(file: File, securityLevel: string, serverMode: boolean): Promise<StoredFileInfo> {
    if (serverMode) {
      const r = await api.uploadFile(file, securityLevel);
      return { id: r.id, name: r.name, mime: r.mime, size: r.size, sha256: r.sha256 };
    }
    const used = await this.usage(false);
    if (used.usedBytes + file.size > DEMO_QUOTA) throw new Error('Espace de stockage démo saturé (50 Mo).');
    const buf = await file.arrayBuffer();
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await idb('readwrite', s => s.put({ blob: new Blob([buf], { type: mimeOf(file.name) }), size: file.size }, id));
    return { id, name: file.name, mime: mimeOf(file.name), size: file.size, sha256: await sha256Hex(buf) };
  },

  async get(id: string, serverMode: boolean, inline = false): Promise<Blob> {
    if (serverMode) return api.downloadFile(id, inline);
    const rec = await idb<{ blob: Blob } | undefined>('readonly', s => s.get(id));
    if (!rec) throw new Error('Fichier introuvable dans ce navigateur.');
    return rec.blob;
  },

  async remove(id: string, serverMode: boolean): Promise<void> {
    if (serverMode) return api.deleteFile(id);
    await idb('readwrite', s => s.delete(id));
  },

  async usage(serverMode: boolean): Promise<{ usedBytes: number; quotaBytes: number }> {
    if (serverMode) {
      const u = await api.filesUsage();
      return { usedBytes: u.usedBytes, quotaBytes: u.quotaBytes };
    }
    const all = await idb<{ size: number }[]>('readonly', s => s.getAll());
    return { usedBytes: all.reduce((n, r) => n + (r.size || 0), 0), quotaBytes: DEMO_QUOTA };
  },
};
