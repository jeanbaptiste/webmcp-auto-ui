// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveMarimekko } = await import('@nivo/marimekko');
  const { data: rows, id = 'id', value = 'value', dimensions, colors = { scheme: 'spectral' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveMarimekko, {
      data: rows,
      id,
      value,
      dimensions,
      margin: { top: 30, right: 80, bottom: 60, left: 60 },
      innerPadding: 2,
      axisBottom: { legend: id, legendOffset: 40, legendPosition: 'middle' },
      axisLeft: { legend: value, legendOffset: -50, legendPosition: 'middle' },
      colors,
      theme: nivoTheme,
      borderWidth: 1,
      borderColor: { from: 'color', modifiers: [['darker', 0.6]] },
    }),
  );
}
