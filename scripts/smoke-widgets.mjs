// Smoke test for vanilla widgets. Mounts each renderer with a sample payload
// using a linkedom DOM polyfill, asserts render+cleanup succeed and that the
// container has DOM children. Reports a green/red table per widget.
//
// Run: `node scripts/smoke-widgets.mjs` from repo root.

import { parseHTML } from 'linkedom';

const { window, document } = parseHTML('<!DOCTYPE html><html><head></head><body></body></html>');
// Install globals expected by renderers.
globalThis.window = window;
globalThis.document = document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.SVGElement = window.SVGElement ?? window.HTMLElement;
globalThis.Node = window.Node;
globalThis.CustomEvent = window.CustomEvent;
globalThis.Event = window.Event;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = () => ({ overflowY: 'visible', getPropertyValue: () => '' });

// Per-widget sample payloads (mirrors apps/showcase/src/lib/demo-data.ts shapes).
const SAMPLES = {
  // Simple
  stat:        { label: 'Revenue', value: '$42,850', trend: '+12%', trendDir: 'up' },
  kv:          { title: 'Config', rows: [['CPU', '8 vCPU'], ['RAM', '32 GB']] },
  list:        { title: 'Steps', items: ['One', 'Two', 'Three'] },
  chart:       { title: 'Visitors', bars: [['Mon', 420], ['Tue', 580], ['Wed', 310]] },
  alert:       { kind: 'info', title: 'Heads up', message: 'Sample alert' },
  code:        { lang: 'js', code: 'const x = 1;' },
  text:        { content: 'Hello world' },
  actions:     { buttons: [{ label: 'OK' }, { label: 'Cancel' }] },
  tags:        { tags: [{ text: 'one' }, { text: 'two' }] },
  // Rich
  'stat-card': { spec: { label: 'Active users', value: '12,847', trend: 'up', delta: '+18%' } },
  'data-table': {
    title: 'Deploys',
    columns: [{ key: 'env', label: 'Env' }, { key: 'v', label: 'Version' }],
    rows: [{ env: 'prod', v: 'v1.0' }, { env: 'staging', v: 'v1.1' }],
  },
  timeline: {
    items: [
      { date: '2026-04-01', title: 'Kickoff', description: 'Project start' },
      { date: '2026-04-15', title: 'MVP', description: 'Demo' },
    ],
  },
  profile: { name: 'Alice', role: 'Engineer', avatar: 'https://example.com/a.jpg' },
  trombinoscope: {
    people: [
      { name: 'Alice', role: 'Eng', avatar: 'https://e.com/a.jpg' },
      { name: 'Bob', role: 'PM', avatar: 'https://e.com/b.jpg' },
    ],
  },
  'json-viewer': { data: { foo: 1, bar: ['x', 'y'], baz: { nested: true } } },
  hemicycle: {
    title: 'Assembly',
    groups: [
      { name: 'A', count: 100, color: '#3b82f6' },
      { name: 'B', count: 80, color: '#ef4444' },
      { name: 'C', count: 50, color: '#10b981' },
    ],
  },
  'chart-rich': {
    spec: {
      type: 'bar',
      title: 'Sales',
      data: [{ x: 'Jan', y: 100 }, { x: 'Feb', y: 150 }, { x: 'Mar', y: 200 }],
    },
  },
  cards: {
    cards: [{ title: 'A', body: 'one' }, { title: 'B', body: 'two' }],
  },
  'grid-data': {
    columns: ['Name', 'Age'],
    rows: [['Alice', 30], ['Bob', 25]],
  },
  sankey: {
    nodes: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    links: [{ source: 0, target: 1, value: 10 }, { source: 1, target: 2, value: 5 }],
  },
  log: {
    title: 'Logs',
    entries: [
      { level: 'info', message: 'Starting' },
      { level: 'warn', message: 'Slow query' },
      { level: 'error', message: 'Connection lost' },
    ],
  },
  carousel: {
    items: [
      { src: 'https://e.com/1.jpg', caption: 'One' },
      { src: 'https://e.com/2.jpg', caption: 'Two' },
    ],
  },
  gallery: {
    items: [
      { src: 'https://e.com/1.jpg', alt: 'One' },
      { src: 'https://e.com/2.jpg', alt: 'Two' },
    ],
  },
  d3: { code: 'svg.append("circle").attr("r", 10);', height: '200px' },
  'js-sandbox': { code: 'document.getElementById("root").textContent = "hello";' },
  map: {
    center: [48.8, 2.3], zoom: 11,
    markers: [{ lat: 48.85, lng: 2.35, popup: 'Paris' }],
  },
};

// Map: widget kind → renderer module path under packages/ui/dist/widgets
const WIDGETS = [
  ['stat',          'simple/stat.js'],
  ['kv',            'simple/kv.js'],
  ['list',          'simple/list.js'],
  ['chart',         'simple/chart.js'],
  ['alert',         'simple/alert.js'],
  ['code',          'simple/code.js'],
  ['text',          'simple/text.js'],
  ['actions',       'simple/actions.js'],
  ['tags',          'simple/tags.js'],
  ['stat-card',     'rich/stat-card.js'],
  ['data-table',    'rich/data-table.js'],
  ['timeline',      'rich/timeline.js'],
  ['profile',       'rich/profile.js'],
  ['trombinoscope', 'rich/trombinoscope.js'],
  ['json-viewer',   'rich/json-viewer.js'],
  ['hemicycle',     'rich/hemicycle.js'],
  ['chart-rich',    'rich/chart-rich.js'],
  ['cards',         'rich/cards.js'],
  ['grid-data',     'rich/grid-data.js'],
  ['sankey',        'rich/sankey.js'],
  ['log',           'rich/log.js'],
  ['carousel',      'rich/carousel.js'],
  ['gallery',       'rich/gallery.js'],
  ['d3',            'rich/d3.js'],
  ['js-sandbox',    'rich/js-sandbox.js'],
  ['map',           'rich/map.js'],
];

const repoRoot = new URL('..', import.meta.url).pathname;
const distBase = `${repoRoot}packages/ui/dist/widgets/`;

const results = [];
for (const [kind, path] of WIDGETS) {
  const status = { kind, ok: false, mounted: false, cleaned: false, dom: 0, err: null };
  try {
    const url = `file://${distBase}${path}`;
    const mod = await import(url);
    if (typeof mod.render !== 'function') {
      throw new Error(`no exported render() in ${path}`);
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const sample = SAMPLES[kind] ?? {};
    const cleanup = mod.render(container, sample);
    status.mounted = true;
    status.dom = container.children.length;
    if (typeof cleanup === 'function') {
      try { cleanup(); status.cleaned = true; } catch (e) { status.cleaned = false; status.err = `cleanup: ${e.message}`; }
    } else {
      status.cleaned = true; // some renderers may not return cleanup; tolerate
    }
    status.ok = status.mounted && status.dom > 0 && (status.err === null);
  } catch (e) {
    status.err = e?.message || String(e);
  }
  results.push(status);
}

// Report
const W = 18;
const pad = (s, n = W) => (s + ' '.repeat(n)).slice(0, n);
console.log(pad('widget') + pad('mounted', 9) + pad('domchildren', 13) + pad('cleanup', 9) + 'error');
console.log('-'.repeat(80));
let pass = 0, fail = 0;
for (const r of results) {
  const tag = r.ok ? '✓' : '✗';
  console.log(`${tag} ${pad(r.kind)} ${pad(String(r.mounted), 9)}${pad(String(r.dom), 13)}${pad(String(r.cleaned), 9)}${r.err ?? ''}`);
  if (r.ok) pass++; else fail++;
}
console.log('-'.repeat(80));
console.log(`${pass} pass · ${fail} fail / ${results.length} total`);
process.exit(fail > 0 ? 1 : 0);
