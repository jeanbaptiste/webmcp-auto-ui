// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveRadar } = await import('@nivo/radar');
  const { data: rows, keys, indexBy = 'id', colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveRadar, {
      data: rows,
      keys,
      indexBy,
      maxValue: 'auto',
      margin: { top: 50, right: 80, bottom: 40, left: 80 },
      curve: 'linearClosed',
      borderWidth: 2,
      gridLabelOffset: 16,
      dotSize: 8,
      dotBorderWidth: 2,
      colors,
      theme: nivoTheme,
      legends: [
        {
          anchor: 'top-left',
          direction: 'column',
          translateX: -50,
          translateY: -40,
          itemWidth: 80,
          itemHeight: 18,
          symbolSize: 12,
          symbolShape: 'circle',
        },
      ],
    }),
  );
}
