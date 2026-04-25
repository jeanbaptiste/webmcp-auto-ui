// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Kepler.gl helpers — Redux store factory + React mount + cleanup
//
// Kepler.gl is a full React/Redux app. Each widget instantiates an isolated
// Redux store wired with kepler.gl's reducer + react-palm task middleware,
// dispatches a dataset/config payload, and renders <KeplerGl /> via createRoot.
//
// Mapbox token is intentionally left empty — we configure a free MapLibre
// vector basemap via mapStyles so widgets work without any API key. If
// kepler refuses to mount in that mode, the widget falls back to renderEmpty.
// ---------------------------------------------------------------------------

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

let _modsCache: any = null;
let _cssInjected = false;

/** Lazy-load every Kepler.gl sub-module we need (single shot, cached). */
export async function loadKepler(): Promise<any> {
  if (_modsCache) return _modsCache;

  const [
    reactRedux,
    redux,
    reactPalm,
    KeplerMod,
    reducerMod,
    processorsMod,
    actionsMod,
  ] = await Promise.all([
    import('react-redux'),
    import('redux'),
    import('react-palm/tasks'),
    import('kepler.gl'),
    import('kepler.gl/reducers'),
    import('kepler.gl/processors'),
    import('kepler.gl/actions'),
  ]);

  _modsCache = {
    Provider: reactRedux.Provider,
    createStore: redux.createStore,
    combineReducers: redux.combineReducers,
    applyMiddleware: redux.applyMiddleware,
    taskMiddleware: reactPalm.taskMiddleware,
    KeplerGl: KeplerMod.default ?? KeplerMod.KeplerGl ?? KeplerMod,
    keplerGlReducer: reducerMod.default ?? reducerMod.keplerGlReducer ?? reducerMod,
    processCsvData: processorsMod.processCsvData,
    processGeojson: processorsMod.processGeojson,
    processRowObject: processorsMod.processRowObject,
    addDataToMap: actionsMod.addDataToMap,
  };
  return _modsCache;
}

/** Inject Kepler-friendly CSS once (height fix + remove default margins). */
export function ensureKeplerCSS() {
  if (_cssInjected) return;
  const style = document.createElement('style');
  style.setAttribute('data-kepler-shared', 'true');
  style.textContent = `
    .kepler-widget-host { width: 100%; height: 100%; min-height: 480px; position: relative; }
    .kepler-widget-host .kepler-gl { position: absolute; inset: 0; }
  `;
  document.head.appendChild(style);
  _cssInjected = true;
}

/**
 * Free, no-API-key MapLibre vector style usable as Kepler.gl basemap.
 * Carto Voyager works without a Mapbox token.
 */
export const FREE_MAP_STYLES = [
  {
    id: 'voyager',
    label: 'Voyager',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    icon: '',
    layerGroups: [],
  },
  {
    id: 'positron',
    label: 'Positron',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    icon: '',
    layerGroups: [],
  },
  {
    id: 'dark-matter',
    label: 'Dark',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    icon: '',
    layerGroups: [],
  },
];

/**
 * Mount KeplerGl inside `container` with a freshly-created store.
 * Dispatches `addDataToMap` with the supplied dataset + config, then renders.
 *
 * @param container DOM target
 * @param widgetId  unique kepler instance id (also used as react root key)
 * @param payload   { datasets, config?, options? } — same shape as addDataToMap
 */
export async function mountKepler(
  container: HTMLElement,
  widgetId: string,
  payload: { datasets: any; config?: any; options?: any },
): Promise<() => void> {
  ensureKeplerCSS();
  let mods: any;
  try {
    mods = await loadKepler();
  } catch (err) {
    return renderEmpty(container, widgetId, `Kepler failed to load: ${(err as Error).message}`);
  }

  const {
    Provider,
    createStore,
    combineReducers,
    applyMiddleware,
    taskMiddleware,
    KeplerGl,
    keplerGlReducer,
    addDataToMap,
  } = mods;

  // Configure reducer with our free MapLibre basemaps and no mapbox token.
  const customizedReducer = (typeof keplerGlReducer.initialState === 'function'
    ? keplerGlReducer.initialState({
        mapStyle: { mapStyles: FREE_MAP_STYLES, styleType: 'voyager' },
        uiState: { readOnly: false, currentModal: null },
      })
    : keplerGlReducer);

  let store: any;
  try {
    store = createStore(
      combineReducers({ keplerGl: customizedReducer }),
      {},
      applyMiddleware(taskMiddleware),
    );
  } catch (err) {
    return renderEmpty(container, widgetId, `Redux store init failed: ${(err as Error).message}`);
  }

  // Sane container sizing.
  container.classList.add('kepler-widget-host');
  if (!container.style.height) container.style.height = '100%';
  if (!container.style.minHeight) container.style.minHeight = '480px';
  if (!container.style.width) container.style.width = '100%';

  let width = container.clientWidth || 800;
  let height = container.clientHeight || 480;

  // Dispatch data BEFORE first render so KeplerGl picks it up on mount.
  try {
    store.dispatch(addDataToMap(payload));
  } catch (err) {
    return renderEmpty(container, widgetId, `addDataToMap failed: ${(err as Error).message}`);
  }

  let root: any;
  try {
    root = createRoot(container);
    root.render(
      createElement(
        Provider,
        { store },
        createElement(KeplerGl, {
          id: widgetId,
          mapboxApiAccessToken: '',
          width,
          height,
        }),
      ),
    );
  } catch (err) {
    return renderEmpty(container, widgetId, `Render failed: ${(err as Error).message}`);
  }

  // Resize observer — re-render on container reflow.
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    if (w === width && h === height) return;
    width = w;
    height = h;
    try {
      root.render(
        createElement(
          Provider,
          { store },
          createElement(KeplerGl, {
            id: widgetId,
            mapboxApiAccessToken: '',
            width,
            height,
          }),
        ),
      );
    } catch {
      // detached — ignore
    }
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    try {
      root.unmount();
    } catch {
      // ignore
    }
    container.innerHTML = '';
    container.classList.remove('kepler-widget-host');
  };
}

/**
 * Build a row dataset suitable for `addDataToMap` from a list of objects
 * with arbitrary keys. Falls back to processRowObject when available.
 */
export async function rowsToDataset(
  rows: any[],
  label = 'data',
  id = 'data',
): Promise<any> {
  if (!Array.isArray(rows) || !rows.length) return null;
  const mods = await loadKepler();
  if (typeof mods.processRowObject === 'function') {
    return {
      info: { id, label },
      data: mods.processRowObject(rows),
    };
  }
  // Manual fallback: build {fields, rows} shape.
  const keys = Array.from(
    rows.reduce((acc: Set<string>, r: any) => {
      if (r && typeof r === 'object') for (const k of Object.keys(r)) acc.add(k);
      return acc;
    }, new Set<string>()),
  );
  const fields = keys.map((name: string) => ({
    name,
    type: typeof rows[0]?.[name] === 'number' ? 'real' : 'string',
  }));
  const data = rows.map((r: any) => keys.map((k: string) => r?.[k] ?? null));
  return {
    info: { id, label },
    data: { fields, rows: data },
  };
}

/** Build a GeoJSON dataset (dispatched as a single feature collection). */
export async function geojsonToDataset(
  geojson: any,
  label = 'geojson',
  id = 'geojson',
): Promise<any> {
  const mods = await loadKepler();
  if (typeof mods.processGeojson === 'function') {
    return {
      info: { id, label },
      data: mods.processGeojson(geojson),
    };
  }
  return null;
}

/**
 * Render an inline error / empty-data message and return a no-op cleanup.
 * Mirrors the pattern used by vegalite/shared.ts.
 */
export function renderEmpty(container: HTMLElement, widgetId: string, hint?: string): () => void {
  container.style.minHeight = container.style.minHeight || '160px';
  container.innerHTML = `
    <div style="padding:14px;border:1px dashed #c66;border-radius:6px;background:#fff5f5;color:#933;font-family:system-ui,sans-serif;font-size:12px;line-height:1.5">
      <strong>${widgetId} — unavailable</strong><br>
      ${hint ?? 'Kepler.gl could not initialise. Provide rows with lat/lng (or GeoJSON) and ensure deps are installed.'}
    </div>`;
  return () => {
    container.innerHTML = '';
  };
}

/**
 * Best-effort coercion of caller input into `[{...}]`.
 * Accepts: array of rows, `{rows: [...]}`, `{data: [...]}`, `{values: [...]}`,
 * or parallel arrays under common keys.
 */
export function toRows(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  for (const k of ['rows', 'data', 'values', 'records', 'points', 'features']) {
    if (Array.isArray(input?.[k])) return input[k];
  }
  // Parallel arrays { lat: [...], lng: [...], value?: [...] }
  const lat = pickArr(input, ['lat', 'latitude', 'y']);
  const lng = pickArr(input, ['lng', 'lon', 'longitude', 'x']);
  if (lat && lng) {
    const value = pickArr(input, ['value', 'weight', 'count']);
    const label = pickArr(input, ['label', 'name', 'id']);
    const n = Math.min(lat.length, lng.length);
    const rows: any[] = [];
    for (let i = 0; i < n; i++) {
      const r: any = { lat: lat[i], lng: lng[i] };
      if (value) r.value = value[i];
      if (label) r.label = label[i];
      rows.push(r);
    }
    return rows;
  }
  return [];
}

function pickArr(obj: any, keys: string[]): any[] | null {
  for (const k of keys) {
    if (Array.isArray(obj?.[k])) return obj[k];
  }
  return null;
}

export { createElement };
