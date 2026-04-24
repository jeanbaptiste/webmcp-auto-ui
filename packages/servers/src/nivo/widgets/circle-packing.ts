// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveCirclePacking } = await import('@nivo/circle-packing');
  const { data: tree, value = 'value', colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveCirclePacking, {
      data: tree,
      id: 'name',
      value,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      colors,
      theme: nivoTheme,
      padding: 4,
      enableLabels: true,
      labelsFilter: (n: any) => n.node.height === 0,
      labelsSkipRadius: 10,
      labelTextColor: { from: 'color', modifiers: [['darker', 2]] },
      borderWidth: 1,
      borderColor: { from: 'color', modifiers: [['darker', 0.5]] },
    }),
  );
}
