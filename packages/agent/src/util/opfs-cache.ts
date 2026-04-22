/**
 * OPFS model cache — download & cache N files per model repo in the
 * Origin Private File System, returning a streamable Uint8Array for each file.
 *
 * Designed for large-model scenarios (MediaPipe .task, transformers.js ONNX
 * multi-file bundles, tokenizers, configs). Each file is streamed from network
 * with `tee()` so the consumer and the OPFS writer share a single download.
 *
 * Cache validation strategy: for every file we write a sibling `<file>.complete`
 * marker containing the total size in bytes. A cache is considered valid only
 * when the file exists AND the marker exists AND their sizes match (and if the
 * caller provided `expectedSize`, that too). This avoids serving half-written
 * files when a tab is closed mid-download.
 */

export interface ModelFileSpec {
  /** Path relative to the repo root (e.g. "onnx/model.onnx", "tokenizer.json") */
  path: string;
  /** Expected byte size if known — enables exact match cache validation */
  expectedSize?: number;
}

export interface CacheProgress {
  /** 0-1 progress of the file currently being processed */
  fileProgress: number;
  /** 0-1 aggregate progress across all files */
  totalProgress: number;
  status: 'cached' | 'downloading' | 'initializing' | 'error';
  currentFile?: string;
  /** Bytes loaded for current file */
  loaded: number;
  /** Total bytes expected for current file */
  total: number;
}

/** Sanitize a repo id (e.g. "owner/name") into a valid OPFS folder name. */
function sanitizeRepoKey(repo: string): string {
  return repo.replace(/\//g, '__').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

/**
 * Walk nested directory segments, creating subdirectories as needed.
 * Returns `{ parent, filename }` where `parent` is the deepest directory
 * handle and `filename` is the leaf name.
 */
async function resolveFileParent(
  repoDir: FileSystemDirectoryHandle,
  relPath: string,
): Promise<{ parent: FileSystemDirectoryHandle; filename: string }> {
  const segments = relPath.split('/').filter((s) => s.length > 0);
  if (segments.length === 0) throw new Error(`Invalid file path: ${relPath}`);
  let parent = repoDir;
  for (let i = 0; i < segments.length - 1; i++) {
    parent = await parent.getDirectoryHandle(segments[i], { create: true });
  }
  return { parent, filename: segments[segments.length - 1] };
}

/**
 * Removes legacy cache entries: pre-refactor the helper stored model files
 * directly under `webmcp-models/<filename>`. The new layout nests them under
 * `webmcp-models/<repo-key>/<filename>`, so the old top-level files are
 * orphaned and can each weigh several GB.
 * Runs once per process.
 */
let legacyCleanupDone = false;
async function cleanupLegacyModelFiles(modelsDir: FileSystemDirectoryHandle): Promise<void> {
  if (legacyCleanupDone) return;
  legacyCleanupDone = true;
  try {
    const dir = modelsDir as unknown as {
      entries: () => AsyncIterable<[string, FileSystemHandle]>;
    };
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file') {
        try { await modelsDir.removeEntry(name); } catch { /* best-effort */ }
      }
    }
  } catch { /* iteration unsupported or blocked — skip silently */ }
}

/**
 * Load every requested file from the OPFS cache if valid, otherwise stream it
 * from the HuggingFace repo and cache it in the background.
 *
 * The returned Map is keyed by the original `file.path` (including any
 * subdirectory prefix) and contains a `ReadableStream<Uint8Array>` per file.
 * Consumers are responsible for consuming the streams.
 */
export async function loadOrDownloadModel(
  repo: string,
  files: ModelFileSpec[],
  onProgress?: (progress: CacheProgress) => void,
): Promise<Map<string, ReadableStream<Uint8Array>>> {
  const root = await navigator.storage.getDirectory();
  const modelsDir = await root.getDirectoryHandle('webmcp-models', { create: true });
  await cleanupLegacyModelFiles(modelsDir);
  const repoKey = sanitizeRepoKey(repo);
  const repoDir = await modelsDir.getDirectoryHandle(repoKey, { create: true });

  const totalExpected = files.reduce((s, f) => s + (f.expectedSize ?? 0), 0);
  let totalLoaded = 0;
  const result = new Map<string, ReadableStream<Uint8Array>>();

  for (const file of files) {
    const { parent, filename } = await resolveFileParent(repoDir, file.path);
    const markerName = `${filename}.complete`;

    // Clean orphan .crswap files (Chrome WritableStream leftovers).
    try { await parent.removeEntry(`${filename}.crswap`); } catch { /* no swap — OK */ }

    // ── Cache hit attempt ───────────────────────────────────────────
    let cacheHitSize: number | null = null;
    try {
      const fileHandle = await parent.getFileHandle(filename);
      const fileObj = await fileHandle.getFile();
      let expectedFromMarker: number | null = null;
      try {
        const markerHandle = await parent.getFileHandle(markerName);
        const markerText = await (await markerHandle.getFile()).text();
        expectedFromMarker = Number(markerText.trim());
      } catch {
        // Marker missing — try backfill via HEAD request
        try {
          const head = await fetch(`https://huggingface.co/${repo}/resolve/main/${file.path}`, { method: 'HEAD' });
          if (head.ok) {
            const headerSize = Number(head.headers.get('content-length'));
            if (Number.isFinite(headerSize) && headerSize > 0 && fileObj.size === headerSize) {
              // Backfill marker
              const markerHandle = await parent.getFileHandle(markerName, { create: true });
              const markerWritable = await markerHandle.createWritable();
              await markerWritable.write(String(headerSize));
              await markerWritable.close();
              expectedFromMarker = headerSize;
            } else {
              // Size mismatch — drop cached file
              try { await parent.removeEntry(filename); } catch {}
            }
          }
        } catch { /* network/HEAD failed — treat as cache miss */ }
      }

      if (
        expectedFromMarker !== null
        && fileObj.size === expectedFromMarker
        && (file.expectedSize === undefined || file.expectedSize === fileObj.size)
      ) {
        cacheHitSize = fileObj.size;
        onProgress?.({
          fileProgress: 1,
          totalProgress: totalExpected > 0 ? (totalLoaded + fileObj.size) / totalExpected : 1,
          status: 'cached',
          currentFile: file.path,
          loaded: fileObj.size,
          total: fileObj.size,
        });
        totalLoaded += fileObj.size;
        result.set(file.path, fileObj.stream() as ReadableStream<Uint8Array>);
      }
    } catch {
      // Cache miss — fall through to download
    }

    if (cacheHitSize !== null) continue;

    // ── Network download (retry on 503) ─────────────────────────────
    const url = `https://huggingface.co/${repo}/resolve/main/${file.path}`;
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url);
      if (response.ok) break;
      if (response.status === 503 && attempt < 2) {
        const wait = (attempt + 1) * 5000;
        onProgress?.({
          fileProgress: 0,
          totalProgress: totalExpected > 0 ? totalLoaded / totalExpected : 0,
          status: 'downloading',
          currentFile: file.path,
          loaded: 0,
          total: file.expectedSize ?? 0,
        });
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(`Download failed for ${file.path}: ${response.status} ${response.statusText}`);
    }
    if (!response || !response.ok) throw new Error(`Download failed for ${file.path} after retries`);
    if (!response.body) throw new Error(`Response body is null for ${file.path}`);

    const headerTotal = Number(response.headers.get('content-length'));
    const total = Number.isFinite(headerTotal) && headerTotal > 0
      ? headerTotal
      : (file.expectedSize ?? 0);

    const [streamForConsumer, streamForCache] = response.body.tee();

    // Background OPFS cache (fire-and-forget). Marker is written AFTER close
    // succeeds, so a crashed tab will leave a file without a marker, which is
    // detected as "invalid cache" on the next load.
    (async () => {
      try {
        const handle = await parent.getFileHandle(filename, { create: true });
        const writable = await handle.createWritable();
        await streamForCache.pipeTo(writable);
        const markerHandle = await parent.getFileHandle(markerName, { create: true });
        const markerWritable = await markerHandle.createWritable();
        await markerWritable.write(String(total));
        await markerWritable.close();
      } catch {
        try { await parent.removeEntry(filename); } catch {}
        try { await parent.removeEntry(markerName); } catch {}
      }
    })();

    // Capture outer variables for the transform stream closure
    const filePath = file.path;
    const baselineTotalLoaded = totalLoaded;
    const totalExpectedLocal = totalExpected;
    let loaded = 0;
    const progressTransform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.length;
        const denom = totalExpectedLocal || total || 1;
        onProgress?.({
          fileProgress: total > 0 ? loaded / total : 0,
          totalProgress: (baselineTotalLoaded + loaded) / denom,
          status: 'downloading',
          currentFile: filePath,
          loaded,
          total,
        });
        controller.enqueue(chunk);
      },
      flush() {
        // No-op: totalLoaded is advanced eagerly below so that subsequent
        // files reflect the contribution of the current file even if the
        // consumer is still draining the stream.
      },
    });

    // Eagerly advance the baseline for subsequent files: by the time we
    // process the next file we assume this one will complete (or fail — in
    // which case progress is moot anyway).
    totalLoaded += total;

    result.set(file.path, streamForConsumer.pipeThrough(progressTransform));
  }

  return result;
}

/**
 * Remove every cached file for a given repo. Silently no-ops if the repo
 * directory does not exist.
 *
 * Accepts either the original `owner/name` form OR the sanitized key form
 * (`owner__name`). Both are tried so UIs that list cached repos via
 * `listCachedModels()` (which only knows the sanitized key) can delete.
 */
export async function clearModelCache(repo: string): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const modelsDir = await root.getDirectoryHandle('webmcp-models', { create: false });
    const candidates = new Set<string>([repo, sanitizeRepoKey(repo)]);
    for (const key of candidates) {
      try { await modelsDir.removeEntry(key, { recursive: true }); } catch { /* not present */ }
    }
  } catch {
    // Nothing to clear
  }
}

/**
 * Info about a single cached model repo in OPFS.
 *
 * Note: `repo` is the sanitized folder name as it appears on disk
 * (e.g. `google__gemma-3n-E2B-it-litert-preview`). The original `owner/name`
 * is not recoverable after sanitization.
 */
export interface CachedModelInfo {
  repo: string;
  size: number;
  fileCount: number;
  lastModified: number;
}

/**
 * Recursively sum file sizes under a directory handle, tracking count and
 * max lastModified. Ignores entries that fail to enumerate.
 */
export async function walkDirectoryStats(
  dir: FileSystemDirectoryHandle,
): Promise<{ size: number; fileCount: number; lastModified: number }> {
  let size = 0;
  let fileCount = 0;
  let lastModified = 0;
  try {
    const iter = dir as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> };
    for await (const [, handle] of iter.entries()) {
      if (handle.kind === 'file') {
        try {
          const f = await (handle as FileSystemFileHandle).getFile();
          size += f.size;
          fileCount += 1;
          if (f.lastModified > lastModified) lastModified = f.lastModified;
        } catch { /* skip */ }
      } else if (handle.kind === 'directory') {
        const sub = await walkDirectoryStats(handle as FileSystemDirectoryHandle);
        size += sub.size;
        fileCount += sub.fileCount;
        if (sub.lastModified > lastModified) lastModified = sub.lastModified;
      }
    }
  } catch { /* iteration unsupported */ }
  return { size, fileCount, lastModified };
}

/**
 * List every cached model repo in OPFS with cumulative size, file count and
 * last-modified timestamp. Returns `[]` if `webmcp-models` does not exist
 * or if OPFS itself is unavailable.
 */
export async function listCachedModels(): Promise<CachedModelInfo[]> {
  try {
    if (!navigator.storage?.getDirectory) return [];
    const root = await navigator.storage.getDirectory();
    let modelsDir: FileSystemDirectoryHandle;
    try {
      modelsDir = await root.getDirectoryHandle('webmcp-models', { create: false });
    } catch {
      return [];
    }
    const out: CachedModelInfo[] = [];
    const iter = modelsDir as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> };
    try {
      for await (const [name, handle] of iter.entries()) {
        if (handle.kind !== 'directory') continue;
        const stats = await walkDirectoryStats(handle as FileSystemDirectoryHandle);
        if (stats.size === 0 || stats.fileCount === 0) {
          // Orphan directory (e.g. worker bug that created an empty repo key).
          try { await modelsDir.removeEntry(name, { recursive: true }); } catch { /* best-effort */ }
          continue;
        }
        out.push({ repo: name, size: stats.size, fileCount: stats.fileCount, lastModified: stats.lastModified });
      }
    } catch { /* iteration unsupported */ }
    out.sort((a, b) => b.size - a.size);
    return out;
  } catch {
    return [];
  }
}

/**
 * Nuke the whole `webmcp-models` directory. No-op if it does not exist.
 */
export async function clearAllModelCaches(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry('webmcp-models', { recursive: true });
  } catch {
    // Nothing to clear
  }
}
