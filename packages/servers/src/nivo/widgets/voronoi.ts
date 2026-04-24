// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveVoronoi } = await import('@nivo/voronoi');
  const { data: points, xDomain = [0, 100], yDomain = [0, 100], linkLineColor = '#cccccc', cellLineColor = '#4b4b4b', pointColor = '#c6432d' } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveVoronoi, {
      data: points,
      xDomain,
      yDomain,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      linkLineColor,
      cellLineColor,
      pointSize: 6,
      pointColor,
      theme: nivoTheme,
      enableLinks: true,
    }),
  );
}
