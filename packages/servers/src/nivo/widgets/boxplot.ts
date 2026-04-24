// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveBoxPlot } = await import('@nivo/boxplot');
  const { data: rows, colors = { scheme: 'nivo' }, axisBottomLegend, axisLeftLegend } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveBoxPlot, {
      data: rows,
      margin: { top: 30, right: 120, bottom: 60, left: 60 },
      minValue: 'auto',
      maxValue: 'auto',
      subGroupBy: 'subgroup',
      padding: 0.12,
      colors,
      theme: nivoTheme,
      axisBottom: { legend: axisBottomLegend, legendPosition: 'middle', legendOffset: 40 },
      axisLeft: { legend: axisLeftLegend, legendPosition: 'middle', legendOffset: -50 },
      legends: [
        {
          anchor: 'bottom-right',
          direction: 'column',
          translateX: 100,
          itemWidth: 80,
          itemHeight: 20,
          symbolSize: 14,
        },
      ],
    }),
  );
}
