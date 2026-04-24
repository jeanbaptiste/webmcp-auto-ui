// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveWaffle } = await import('@nivo/waffle');
  const { data: items, total = 100, rows = 10, columns = 14, colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveWaffle, {
      data: items,
      total,
      rows,
      columns,
      padding: 1,
      valueFormat: '.2f',
      margin: { top: 20, right: 20, bottom: 60, left: 20 },
      colors,
      theme: nivoTheme,
      borderRadius: 2,
      legends: [
        {
          anchor: 'bottom',
          direction: 'row',
          translateY: 40,
          itemWidth: 100,
          itemHeight: 20,
          symbolSize: 14,
        },
      ],
    }),
  );
}
