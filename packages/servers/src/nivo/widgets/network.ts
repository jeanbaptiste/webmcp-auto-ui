// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveNetwork } = await import('@nivo/network');
  const { data: graph, linkDistance = 50, centeringStrength = 0.3, repulsivity = 6, nodeSize = 12 } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveNetwork, {
      data: graph,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      linkDistance: (e: any) => (typeof linkDistance === 'number' ? linkDistance : e.distance ?? 30),
      centeringStrength,
      repulsivity,
      nodeSize,
      activeNodeSize: 18,
      nodeColor: (n: any) => n.color ?? '#6eb1d0',
      nodeBorderWidth: 1,
      nodeBorderColor: { from: 'color', modifiers: [['darker', 0.8]] },
      linkThickness: (e: any) => 1 + (e.target?.data?.height ?? 0),
      linkBlendMode: 'multiply',
      theme: nivoTheme,
    }),
  );
}
