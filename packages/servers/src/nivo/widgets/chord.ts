// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveChord } = await import('@nivo/chord');
  const { keys, data: matrix, colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveChord, {
      data: matrix,
      keys,
      margin: { top: 60, right: 60, bottom: 90, left: 60 },
      valueFormat: '.2f',
      padAngle: 0.02,
      innerRadiusRatio: 0.96,
      innerRadiusOffset: 0.02,
      arcOpacity: 1,
      arcBorderWidth: 0,
      ribbonOpacity: 0.5,
      ribbonBorderWidth: 0,
      labelRotation: -90,
      labelTextColor: '#666',
      colors,
      theme: nivoTheme,
    }),
  );
}
