// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveLine } = await import('@nivo/line');
  const {
    data: series,
    xScaleType = 'point',
    yScaleType = 'linear',
    curve = 'monotoneX',
    colors = { scheme: 'nivo' },
    enableArea = false,
    axisBottomLegend,
    axisLeftLegend,
  } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveLine, {
      data: series,
      margin: { top: 30, right: 110, bottom: 50, left: 60 },
      xScale: { type: xScaleType },
      yScale: { type: yScaleType, min: 'auto', max: 'auto' },
      curve,
      colors,
      theme: nivoTheme,
      enableArea,
      useMesh: true,
      axisBottom: { legend: axisBottomLegend, legendPosition: 'middle', legendOffset: 36 },
      axisLeft: { legend: axisLeftLegend, legendPosition: 'middle', legendOffset: -50 },
      legends: [
        {
          anchor: 'bottom-right',
          direction: 'column',
          translateX: 100,
          itemWidth: 90,
          itemHeight: 20,
          symbolSize: 12,
        },
      ],
      animate: true,
    }),
  );
}
