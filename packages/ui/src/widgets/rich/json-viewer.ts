/**
 * JsonViewer — vanilla renderer
 *
 * Ported from JsonViewer.svelte (recursive snippet -> recursive JS function).
 * Renders a JSON value with collapsible object/array nodes, typed colors,
 * and cycle detection. XSS-safe (textContent only).
 */

export interface JsonViewerSpec {
  title?: string;
  data?: unknown;
  maxDepth?: number;
  expanded?: boolean;
  theme?: 'dark' | 'light';
}

export interface JsonViewerProps {
  spec?: Partial<JsonViewerSpec>;
  data?: unknown;
}

const COLOR_NULL = 'var(--color-text2)';
const COLOR_BOOL = '#a855f7';
const COLOR_NUMBER = 'var(--color-amber)';
const COLOR_STRING = 'var(--color-teal)';

function dispatch(container: HTMLElement, action: string, payload: unknown) {
  container.dispatchEvent(
    new CustomEvent('widget:interact', {
      detail: { action, payload },
      bubbles: true,
    }),
  );
}

function makeSpan(text: string, color?: string, className?: string): HTMLSpanElement {
  const s = document.createElement('span');
  if (color) s.style.color = color;
  if (className) s.className = className;
  s.textContent = text;
  return s;
}

export function render(container: HTMLElement, props: JsonViewerProps | unknown = {}): () => void {
  // Tolerate being called with just the raw data, or with {spec, data}.
  let spec: Partial<JsonViewerSpec> = {};
  let rawData: unknown;
  if (props && typeof props === 'object' && ('spec' in (props as any) || 'data' in (props as any))) {
    const p = props as JsonViewerProps;
    spec = p.spec ?? {};
    rawData = p.data;
  } else {
    rawData = props;
  }

  const value = spec.data !== undefined ? spec.data : rawData;
  const maxDepth = spec.maxDepth ?? 5;
  const expanded = spec.expanded !== false;

  // Root wrapper
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'bg-bg border border-border rounded-lg p-3 md:p-4 font-mono text-xs leading-5 text-text1';
  container.appendChild(root);

  if (spec.title) {
    const title = document.createElement('div');
    title.className = 'font-sans text-sm font-semibold text-text1 mb-3';
    title.textContent = spec.title;
    root.appendChild(title);
  }

  // Track toggles for interact events + cleanup.
  const toggleHandlers: Array<{ el: HTMLDetailsElement; handler: EventListener }> = [];

  // Cycle detection: WeakSet of currently-visited object/array references in the
  // current DFS path. We can't use a Set because we must allow the same object
  // to appear in sibling branches (non-cycle). Use an ancestor stack instead.
  function renderNode(val: unknown, depth: number, ancestors: Set<object>): HTMLElement {
    // null
    if (val === null) {
      return makeSpan('null', COLOR_NULL);
    }

    const t = typeof val;

    if (t === 'boolean') {
      return makeSpan(String(val), COLOR_BOOL);
    }
    if (t === 'number') {
      return makeSpan(String(val), COLOR_NUMBER);
    }
    if (t === 'string') {
      return makeSpan(`"${val as string}"`, COLOR_STRING);
    }

    // Arrays
    if (Array.isArray(val)) {
      if (ancestors.has(val)) {
        return makeSpan('[Circular]', undefined, 'text-text2');
      }
      if (depth >= maxDepth) {
        return makeSpan(`[Array(${val.length})]`, undefined, 'text-text2');
      }
      const details = document.createElement('details');
      if (expanded && depth < 2) details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'cursor-pointer text-text2 hover:text-text1 select-none';
      summary.textContent = `Array(${val.length})`;
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'ml-4 border-l border-border pl-3 mt-0.5';

      ancestors.add(val);
      val.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'py-0.5';
        const idx = document.createElement('span');
        idx.className = 'text-text2 text-xs mr-1';
        idx.textContent = `${i}:`;
        row.appendChild(idx);
        row.appendChild(renderNode(item, depth + 1, ancestors));
        body.appendChild(row);
      });
      ancestors.delete(val);

      details.appendChild(body);

      const handler: EventListener = () => {
        dispatch(container, 'toggle', { kind: 'array', open: details.open, length: val.length });
      };
      details.addEventListener('toggle', handler);
      toggleHandlers.push({ el: details, handler });

      return details;
    }

    // Objects
    if (t === 'object') {
      const obj = val as Record<string, unknown>;
      if (ancestors.has(obj)) {
        return makeSpan('[Circular]', undefined, 'text-text2');
      }
      const keys = Object.keys(obj);
      if (depth >= maxDepth) {
        return makeSpan(`{Object(${keys.length})}`, undefined, 'text-text2');
      }
      const details = document.createElement('details');
      if (expanded && depth < 2) details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'cursor-pointer text-text2 hover:text-text1 select-none';
      summary.textContent = `{${keys.length}}`;
      details.appendChild(summary);

      const body = document.createElement('div');
      body.className = 'ml-4 border-l border-border pl-3 mt-0.5';

      ancestors.add(obj);
      for (const k of keys) {
        const row = document.createElement('div');
        row.className = 'py-0.5';
        const key = document.createElement('span');
        key.className = 'text-accent mr-1';
        key.textContent = `"${k}":`;
        row.appendChild(key);
        row.appendChild(renderNode(obj[k], depth + 1, ancestors));
        body.appendChild(row);
      }
      ancestors.delete(obj);

      details.appendChild(body);

      const handler: EventListener = () => {
        dispatch(container, 'toggle', { kind: 'object', open: details.open, keys: keys.length });
      };
      details.addEventListener('toggle', handler);
      toggleHandlers.push({ el: details, handler });

      return details;
    }

    // Fallback (undefined, function, symbol, bigint)
    return makeSpan(String(val), undefined, 'text-text2');
  }

  if (value === undefined) {
    root.appendChild(makeSpan('undefined', undefined, 'text-text2'));
  } else {
    root.appendChild(renderNode(value, 0, new Set<object>()));
  }

  return () => {
    for (const { el, handler } of toggleHandlers) {
      el.removeEventListener('toggle', handler);
    }
    toggleHandlers.length = 0;
    container.innerHTML = '';
  };
}
