// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveTreeMap } = await import('@nivo/treemap');
  const { data: tree, value = 'value', colors = { scheme: 'nivo' } } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveTreeMap, {
      data: tree,
      identity: 'name',
      value,
      valueFormat: '.02s',
      leavesOnly: false,
      tile: 'squarify',
      innerPadding: 3,
      outerPadding: 3,
      labelSkipSize: 12,
      colors,
      theme: nivoTheme,
      borderColor: { from: 'color', modifiers: [['darker', 0.3]] },
      labelTextColor: { from: 'color', modifiers: [['darker', 3]] },
      parentLabelTextColor: { from: 'color', modifiers: [['darker', 3]] },
    }),
  );
}
