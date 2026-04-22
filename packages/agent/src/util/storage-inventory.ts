/**
 * storage-inventory — enumerate OPFS (outside webmcp-models), Cache Storage
 * API and IndexedDB entries. Best-effort: any per-entry failure is swallowed.
 */
import { walkDirectoryStats } from './opfs-cache.js';

export type StorageSource = 'opfs' | 'cache-storage' | 'indexeddb';

export interface StorageEntry {
  source: StorageSource;
  key: string;
  size: number;
  sizeKnown: boolean;
  itemCount: number;
  lastModified: number;
  modelLike: boolean;
}

const MODEL_HINTS = [
  'huggingface', 'hf-', 'hf_', 'gemma', 'litert', 'onnx',
  'qwen', 'mistral', 'llama', 'transformers', 'tokenizer', 'mediapipe',
];

const BLOB_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB — skip blob() fallback above this

function isModelLike(key: string): boolean {
  const k = key.toLowerCase();
  return MODEL_HINTS.some((h) => k.includes(h));
}

/** OPFS entries outside the `webmcp-models` directory (which has its own UI). */
async function listOpfsEntries(): Promise<StorageEntry[]> {
  const out: StorageEntry[] = [];
  try {
    if (!navigator.storage?.getDirectory) return out;
    const root = await navigator.storage.getDirectory();
    const iter = root as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> };
    for await (const [name, handle] of iter.entries()) {
      if (name === 'webmcp-models') continue;
      if (handle.kind !== 'directory') continue;
      try {
        const stats = await walkDirectoryStats(handle as FileSystemDirectoryHandle);
        out.push({
          source: 'opfs',
          key: name,
          size: stats.size,
          sizeKnown: true,
          itemCount: stats.fileCount,
          lastModified: stats.lastModified,
          modelLike: isModelLike(name),
        });
      } catch { /* skip entry */ }
    }
  } catch { /* OPFS unavailable */ }
  return out;
}

async function measureResponse(response: Response): Promise<{ size: number; sizeKnown: boolean; lastModified: number }> {
  let size = 0;
  let sizeKnown = false;
  let lastModified = 0;
  try {
    const cl = response.headers.get('content-length');
    const parsed = cl !== null ? parseInt(cl, 10) : NaN;
    if (Number.isFinite(parsed) && parsed >= 0) {
      size = parsed;
      sizeKnown = true;
    } else {
      // Fallback: blob() — but only for small responses to avoid GB memory hits.
      try {
        const blob = await response.clone().blob();
        if (blob.size < BLOB_SIZE_LIMIT) {
          size = blob.size;
          sizeKnown = true;
        }
      } catch { /* blob failed */ }
    }
    const dateHdr = response.headers.get('date');
    if (dateHdr) {
      const t = new Date(dateHdr).getTime();
      if (Number.isFinite(t)) lastModified = t;
    }
  } catch { /* header access failed */ }
  return { size, sizeKnown, lastModified };
}

async function listCacheStorageEntries(): Promise<StorageEntry[]> {
  const out: StorageEntry[] = [];
  try {
    if (typeof caches === 'undefined' || !caches.keys) return out;
    const names = await caches.keys();
    for (const name of names) {
      try {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        let totalSize = 0;
        let anyUnknown = false;
        let lastModified = 0;
        for (const req of requests) {
          try {
            const resp = await cache.match(req);
            if (!resp) continue;
            const m = await measureResponse(resp);
            if (m.sizeKnown) totalSize += m.size;
            else anyUnknown = true;
            if (m.lastModified > lastModified) lastModified = m.lastModified;
          } catch { /* per-request skip */ }
        }
        out.push({
          source: 'cache-storage',
          key: name,
          size: totalSize,
          sizeKnown: !anyUnknown,
          itemCount: requests.length,
          lastModified,
          modelLike: isModelLike(name),
        });
      } catch { /* skip cache */ }
    }
  } catch { /* Cache API unavailable */ }
  return out;
}

async function listIndexedDbEntries(): Promise<StorageEntry[]> {
  const out: StorageEntry[] = [];
  try {
    const idb = indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string; version?: number }>> };
    if (typeof idb.databases !== 'function') return out;
    const dbs = await idb.databases();
    for (const db of dbs) {
      if (!db.name) continue;
      out.push({
        source: 'indexeddb',
        key: db.name,
        size: 0,
        sizeKnown: false,
        itemCount: db.version ?? 0,
        lastModified: 0,
        modelLike: isModelLike(db.name),
      });
    }
  } catch { /* IDB listing unsupported (e.g. older Safari) */ }
  return out;
}

/** Enumerate all Chrome-visible caches — OPFS (minus webmcp-models), Cache Storage, IndexedDB. */
export async function listAllStorage(): Promise<StorageEntry[]> {
  const [opfs, cacheStorage, idb] = await Promise.all([
    listOpfsEntries(),
    listCacheStorageEntries(),
    listIndexedDbEntries(),
  ]);
  return [...opfs, ...cacheStorage, ...idb];
}

function deleteIdb(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch { resolve(); }
  });
}

/** Delete a single entry regardless of source. */
export async function deleteStorageEntry(entry: StorageEntry): Promise<void> {
  try {
    if (entry.source === 'opfs') {
      const root = await navigator.storage.getDirectory();
      try { await root.removeEntry(entry.key, { recursive: true }); } catch { /* best-effort */ }
    } else if (entry.source === 'cache-storage') {
      try { await caches.delete(entry.key); } catch { /* best-effort */ }
    } else if (entry.source === 'indexeddb') {
      await deleteIdb(entry.key);
    }
  } catch { /* best-effort */ }
}

/** Delete every entry of a given source. */
export async function clearAllStorage(source: StorageSource): Promise<void> {
  try {
    if (source === 'opfs') {
      const entries = await listOpfsEntries();
      for (const e of entries) await deleteStorageEntry(e);
    } else if (source === 'cache-storage') {
      const names = await caches.keys();
      for (const n of names) { try { await caches.delete(n); } catch { /* skip */ } }
    } else if (source === 'indexeddb') {
      const entries = await listIndexedDbEntries();
      for (const e of entries) await deleteIdb(e.key);
    }
  } catch { /* best-effort */ }
}
