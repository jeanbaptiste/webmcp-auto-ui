// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared Nivo utilities — React mount helper, theme, cleanup
// ---------------------------------------------------------------------------

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Theme-adaptive Nivo theme — mid-gray text, light-gray grid, transparent bg.
 * Usable on both light and dark backgrounds.
 */
export const nivoTheme = {
  background: 'transparent',
  text: { fill: '#666', fontSize: 11 },
  axis: {
    domain: { line: { stroke: '#ccc' } },
    legend: { text: { fill: '#666' } },
    ticks: {
      line: { stroke: '#ccc', strokeWidth: 1 },
      text: { fill: '#666' },
    },
  },
  grid: { line: { stroke: '#ccc', strokeWidth: 1 } },
  legends: { text: { fill: '#666' } },
  tooltip: {
    container: {
      background: '#fff',
      color: '#333',
      fontSize: 12,
      borderRadius: 4,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    },
  },
  labels: { text: { fill: '#333' } },
};

/** Default color schemes usable as-is with Nivo `colors={{ scheme: ... }}`. */
export const DEFAULT_COLORS = { scheme: 'nivo' };

/**
 * Ensure the container has a sane height, then mount a React element via
 * createRoot. Returns a cleanup function that unmounts the root.
 */
export function mountReact(
  container: HTMLElement,
  element: any,
): () => void {
  if (!container.style.height) container.style.height = '100%';
  if (!container.style.minHeight) container.style.minHeight = '400px';
  if (!container.style.width) container.style.width = '100%';
  const root = createRoot(container);
  root.render(element);
  return () => {
    try {
      root.unmount();
    } catch {
      // already unmounted — ignore
    }
  };
}

/**
 * Shorthand: dynamically import a Nivo package, pick a component by name,
 * mount it with props. Returns cleanup fn.
 */
export async function mountNivo(
  container: HTMLElement,
  pkg: string,
  componentName: string,
  props: Record<string, any>,
): Promise<() => void> {
  const mod: any = await import(/* @vite-ignore */ pkg);
  const Component = mod[componentName];
  if (!Component) {
    throw new Error(`[nivo] component ${componentName} not found in ${pkg}`);
  }
  const merged = { theme: nivoTheme, ...props };
  return mountReact(container, createElement(Component, merged));
}

export { createElement };
