// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Recharts utilities — lazy loading, theme, React root mount helper
// ---------------------------------------------------------------------------

let _recharts: any = null;
let _react: any = null;
let _reactDomClient: any = null;

/** Lazy-load recharts (single import, cached). */
export async function loadRecharts(): Promise<any> {
  if (_recharts) return _recharts;
  _recharts = await import('recharts');
  return _recharts;
}

/** Lazy-load react (single import, cached). */
export async function loadReact(): Promise<any> {
  if (_react) return _react;
  _react = await import('react');
  return _react;
}

/** Lazy-load react-dom/client (single import, cached). */
export async function loadReactDomClient(): Promise<any> {
  if (_reactDomClient) return _reactDomClient;
  _reactDomClient = await import('react-dom/client');
  return _reactDomClient;
}

/**
 * Theme-adaptive colors.
 * Mid-gray text (#666) and light grid (#ccc) for dual light/dark readability.
 */
export const THEME = {
  text: '#666',
  grid: '#ccc',
  stroke: '#666',
};

/** Default color palette for multi-series charts. */
export const PALETTE = [
  '#4f8cff',
  '#ff7a59',
  '#36c980',
  '#c264fe',
  '#ffbe3d',
  '#ff5f99',
  '#30c7d4',
  '#8c7dff',
  '#f25f5c',
  '#70c1b3',
];

export function color(i: number): string {
  return PALETTE[i % PALETTE.length];
}

/** Ensure a container has a usable size for ResponsiveContainer. */
export function sizeContainer(container: HTMLElement) {
  container.style.width = container.style.width || '100%';
  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '400px';
}

/**
 * Mount a React tree inside `container`. Returns a cleanup function that
 * unmounts the root.
 */
export async function mountReact(
  container: HTMLElement,
  tree: any,
): Promise<() => void> {
  sizeContainer(container);
  const { createRoot } = await loadReactDomClient();
  const root = createRoot(container);
  root.render(tree);
  return () => {
    try {
      root.unmount();
    } catch {
      // ignore
    }
  };
}
