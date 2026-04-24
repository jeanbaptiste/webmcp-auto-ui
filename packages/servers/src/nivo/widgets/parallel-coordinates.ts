// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveParallelCoordinates } = await import('@nivo/parallel-coordinates');
  const { data: rows, variables, colors = { scheme: 'spectral' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveParallelCoordinates, {
      data: rows,
      variables,
      margin: { top: 50, right: 60, bottom: 50, left: 60 },
      layout: 'horizontal',
      colors,
      theme: nivoTheme,
      lineWidth: 2,
    }),
  );
}
