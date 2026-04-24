// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveBullet } = await import('@nivo/bullet');
  const { data: rows, layout = 'horizontal', rangeColors = 'seq:blue_purple', measureColors = 'seq:red_purple', markerColors = 'seq:red_purple' } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveBullet, {
      data: rows,
      margin: { top: 50, right: 90, bottom: 50, left: 90 },
      spacing: 46,
      titleAlign: 'start',
      titleOffsetX: -70,
      measureSize: 0.2,
      layout,
      rangeColors,
      measureColors,
      markerColors,
      theme: nivoTheme,
    }),
  );
}
