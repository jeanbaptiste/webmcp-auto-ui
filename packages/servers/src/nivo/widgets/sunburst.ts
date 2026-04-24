// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveSunburst } = await import('@nivo/sunburst');
  const { data: tree, value = 'value', colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveSunburst, {
      data: tree,
      id: 'name',
      value,
      cornerRadius: 2,
      borderWidth: 1,
      borderColor: '#fff',
      colors,
      theme: nivoTheme,
      childColor: { from: 'color', modifiers: [['brighter', 0.1]] },
      enableArcLabels: true,
      arcLabelsSkipAngle: 10,
      arcLabelsTextColor: { from: 'color', modifiers: [['darker', 2]] },
    }),
  );
}
