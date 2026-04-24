// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveSankey } = await import('@nivo/sankey');
  const { data: graph, colors = { scheme: 'category10' }, align = 'justify' } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveSankey, {
      data: graph,
      margin: { top: 30, right: 160, bottom: 30, left: 50 },
      align,
      colors,
      theme: nivoTheme,
      nodeOpacity: 1,
      nodeThickness: 18,
      nodeInnerPadding: 3,
      nodeSpacing: 24,
      nodeBorderWidth: 0,
      linkOpacity: 0.5,
      linkHoverOthersOpacity: 0.1,
      enableLinkGradient: true,
      labelPosition: 'outside',
      labelTextColor: '#666',
    }),
  );
}
