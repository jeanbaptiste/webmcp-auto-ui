// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveHeatMap } = await import('@nivo/heatmap');
  const { data: rows, colors = { type: 'sequential', scheme: 'blues' }, axisTopLegend, axisLeftLegend } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveHeatMap, {
      data: rows,
      margin: { top: 60, right: 80, bottom: 60, left: 80 },
      valueFormat: '>-.2f',
      theme: nivoTheme,
      colors,
      axisTop: { legend: axisTopLegend, legendPosition: 'middle', legendOffset: -40, tickRotation: -45 },
      axisLeft: { legend: axisLeftLegend, legendPosition: 'middle', legendOffset: -60 },
      labelTextColor: { from: 'color', modifiers: [['darker', 2]] },
      animate: true,
    }),
  );
}
