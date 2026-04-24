// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveStream } = await import('@nivo/stream');
  const { data: rows, keys, offsetType = 'silhouette', colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveStream, {
      data: rows,
      keys,
      margin: { top: 30, right: 110, bottom: 50, left: 60 },
      axisBottom: { legend: '', legendOffset: 36 },
      axisLeft: { legend: '', legendOffset: -40 },
      offsetType,
      colors,
      theme: nivoTheme,
      borderColor: { theme: 'background' },
      dotSize: 6,
      dotColor: { from: 'color' },
      dotBorderWidth: 1,
      dotBorderColor: { from: 'color', modifiers: [['darker', 0.7]] },
      legends: [
        {
          anchor: 'bottom-right',
          direction: 'column',
          translateX: 100,
          itemWidth: 80,
          itemHeight: 20,
          symbolSize: 12,
          symbolShape: 'circle',
        },
      ],
    }),
  );
}
