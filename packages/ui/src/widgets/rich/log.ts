/**
 * LogViewer vanilla renderer.
 *
 * Contract:
 *   render(container, data): () => void (cleanup)
 *
 * `data` is expected to match { spec, data } where spec is Partial<LogViewerSpec>.
 * For robustness, if the caller passes a bare spec or a bare array of entries,
 * we try to coerce.
 */

export interface LogEntry {
  timestamp?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source?: string;
}

export interface LogViewerSpec {
  title?: string;
  entries?: LogEntry[];
  maxHeight?: string;
}

const LEVEL_CLASS: Record<string, string> = {
  debug: 'text-text2',
  info: 'text-teal',
  warn: 'text-amber',
  error: 'text-accent2',
};

function extractSpecAndData(input: any): { spec: Partial<LogViewerSpec>; data: unknown } {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    if ('spec' in input || 'data' in input) {
      return {
        spec: (input.spec ?? {}) as Partial<LogViewerSpec>,
        data: input.data,
      };
    }
    // Bare spec object.
    return { spec: input as Partial<LogViewerSpec>, data: undefined };
  }
  if (Array.isArray(input)) {
    return { spec: {}, data: input };
  }
  return { spec: {}, data: undefined };
}

function resolveEntries(spec: Partial<LogViewerSpec>, data: unknown): LogEntry[] {
  if (Array.isArray(spec.entries) && spec.entries.length) return spec.entries;
  if (Array.isArray(data)) return data as LogEntry[];
  return [];
}

export function render(container: HTMLElement, data: any): () => void {
  const { spec, data: payload } = extractSpecAndData(data);
  const entries = resolveEntries(spec, payload);
  const maxHeight = spec.maxHeight ?? '320px';

  const rowListeners: Array<{ el: HTMLElement; handler: (ev: MouseEvent) => void }> = [];

  const root = document.createElement('div');
  root.className = 'bg-bg border border-border rounded-lg font-mono';
  root.setAttribute('role', 'log');
  root.setAttribute('aria-live', 'polite');

  if (spec.title) {
    const header = document.createElement('div');
    header.className = 'px-4 py-2 border-b border-border text-xs text-text2';
    header.textContent = spec.title;
    root.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'overflow-y-auto text-xs leading-5 p-3 flex flex-col gap-0.5';
  body.style.maxHeight = maxHeight;

  if (!entries.length) {
    const empty = document.createElement('span');
    empty.className = 'text-text2';
    empty.textContent = 'No log entries';
    body.appendChild(empty);
  } else {
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i] ?? ({ message: '' } as LogEntry);
      const row = document.createElement('div');
      row.className = 'flex gap-2 items-start hover:bg-surface2 px-1 rounded cursor-pointer';
      row.setAttribute('role', 'listitem');
      row.dataset.index = String(i);
      if (e.level) row.dataset.level = e.level;

      if (e.timestamp) {
        const ts = document.createElement('span');
        ts.className = 'text-text2 flex-shrink-0';
        ts.textContent = e.timestamp;
        row.appendChild(ts);
      }

      const level = e.level ?? 'info';
      const lvl = document.createElement('span');
      lvl.className = `flex-shrink-0 uppercase text-[10px] font-semibold w-10 ${LEVEL_CLASS[level] ?? LEVEL_CLASS.info}`;
      lvl.textContent = level;
      row.appendChild(lvl);

      if (e.source) {
        const src = document.createElement('span');
        src.className = 'text-text2 flex-shrink-0';
        src.textContent = `[${e.source}]`;
        row.appendChild(src);
      }

      const msg = document.createElement('span');
      msg.className = 'text-text1 break-all';
      msg.textContent = e.message ?? '';
      row.appendChild(msg);

      const handler = (_ev: MouseEvent) => {
        row.dispatchEvent(
          new CustomEvent('widget:interact', {
            bubbles: true,
            composed: true,
            detail: { action: 'log-entry-click', payload: { index: i, entry: e } },
          }),
        );
      };
      row.addEventListener('click', handler);
      rowListeners.push({ el: row, handler });

      body.appendChild(row);
    }
  }

  root.appendChild(body);
  container.appendChild(root);

  return () => {
    for (const { el, handler } of rowListeners) {
      el.removeEventListener('click', handler);
    }
    rowListeners.length = 0;
    container.innerHTML = '';
  };
}
