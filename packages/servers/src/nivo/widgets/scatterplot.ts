// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveScatterPlot } = await import('@nivo/scatterplot');
  const { data: series, colors = { scheme: 'nivo' }, nodeSize = 9, axisBottomLegend, axisLeftLegend } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveScatterPlot, {
      data: series,
      margin: { top: 30, right: 130, bottom: 60, left: 70 },
      xScale: { type: 'linear', min: 'auto', max: 'auto' },
      yScale: { type: 'linear', min: 'auto', max: 'auto' },
      colors,
      theme: nivoTheme,
      nodeSize,
      useMesh: true,
      axisBottom: { legend: axisBottomLegend, legendPosition: 'middle', legendOffset: 40 },
      axisLeft: { legend: axisLeftLegend, legendPosition: 'middle', legendOffset: -55 },
      legends: [
        {
          anchor: 'bottom-right',
          direction: 'column',
          translateX: 120,
          itemWidth: 100,
          itemHeight: 12,
          symbolSize: 12,
          symbolShape: 'circle',
        },
      ],
    }),
  );
}
