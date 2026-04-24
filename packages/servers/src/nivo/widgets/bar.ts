// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveBar } = await import('@nivo/bar');
  const {
    data: rows,
    keys = ['value'],
    indexBy = 'id',
    groupMode = 'stacked',
    layout = 'vertical',
    colors = { scheme: 'nivo' },
    axisBottomLegend,
    axisLeftLegend,
  } = data as any;
  const margin = { top: 30, right: 130, bottom: 50, left: 60 };
  return mountReact(
    container,
    createElement(ResponsiveBar, {
      data: rows,
      keys,
      indexBy,
      groupMode,
      layout,
      margin,
      padding: 0.3,
      colors,
      theme: nivoTheme,
      axisBottom: { legend: axisBottomLegend, legendPosition: 'middle', legendOffset: 36 },
      axisLeft: { legend: axisLeftLegend, legendPosition: 'middle', legendOffset: -50 },
      labelSkipWidth: 16,
      labelSkipHeight: 16,
      legends: [
        {
          dataFrom: 'keys',
          anchor: 'bottom-right',
          direction: 'column',
          translateX: 120,
          itemWidth: 100,
          itemHeight: 20,
          symbolSize: 14,
        },
      ],
      animate: true,
    }),
  );
}
