// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveTree } = await import('@nivo/tree');
  const { data: tree, mode = 'tree', layout = 'top-to-bottom', identity = 'name' } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveTree, {
      data: tree,
      identity,
      mode,
      layout,
      nodeSize: 12,
      activeNodeSize: 20,
      nodeColor: { scheme: 'tableau10' },
      fixNodeColorAtDepth: 1,
      linkThickness: 2,
      activeLinkThickness: 6,
      linkColor: { from: 'target.color', modifiers: [['opacity', 0.4]] },
      margin: { top: 40, right: 40, bottom: 40, left: 40 },
      theme: nivoTheme,
      motionConfig: 'stiff',
      meshDetectionRadius: 80,
    }),
  );
}
