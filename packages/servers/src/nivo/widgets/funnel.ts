// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveFunnel } = await import('@nivo/funnel');
  const { data: steps, colors = { scheme: 'spectral' }, direction = 'vertical' } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveFunnel, {
      data: steps,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      valueFormat: '>-.2s',
      colors,
      theme: nivoTheme,
      direction,
      borderWidth: 20,
      labelColor: { from: 'color', modifiers: [['darker', 3]] },
      beforeSeparatorLength: 60,
      beforeSeparatorOffset: 20,
      afterSeparatorLength: 60,
      afterSeparatorOffset: 20,
      currentPartSizeExtension: 10,
      currentBorderWidth: 28,
    }),
  );
}
