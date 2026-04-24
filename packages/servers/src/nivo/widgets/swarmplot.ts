// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveSwarmPlot } = await import('@nivo/swarmplot');
  const { data: rows, groups, groupBy = 'group', identity = 'id', value = 'value', size = 8, colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveSwarmPlot, {
      data: rows,
      groups,
      identity,
      value,
      valueScale: { type: 'linear', min: 'auto', max: 'auto' },
      size,
      spacing: 2,
      margin: { top: 30, right: 60, bottom: 60, left: 70 },
      colors,
      theme: nivoTheme,
      groupBy,
      axisBottom: { legend: groupBy, legendOffset: 40, legendPosition: 'middle' },
      axisLeft: { legend: value, legendOffset: -50, legendPosition: 'middle' },
    }),
  );
}
