// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsivePie } = await import('@nivo/pie');
  const { data: slices, colors = { scheme: 'nivo' }, innerRadius = 0.5, padAngle = 0.7, cornerRadius = 3 } = data as any;
  return mountReact(
    container,
    createElement(ResponsivePie, {
      data: slices,
      margin: { top: 30, right: 80, bottom: 60, left: 80 },
      innerRadius,
      padAngle,
      cornerRadius,
      colors,
      theme: nivoTheme,
      activeOuterRadiusOffset: 8,
      arcLinkLabelsTextColor: '#666',
      arcLinkLabelsThickness: 2,
      arcLinkLabelsColor: { from: 'color' },
      arcLabelsSkipAngle: 10,
      legends: [
        {
          anchor: 'bottom',
          direction: 'row',
          translateY: 50,
          itemWidth: 80,
          itemHeight: 18,
          symbolSize: 12,
          symbolShape: 'circle',
        },
      ],
      animate: true,
    }),
  );
}
