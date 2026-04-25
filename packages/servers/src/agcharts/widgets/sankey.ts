// @ts-nocheck
import { agChart, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes, links, title } = data as any;
  if (!Array.isArray(links) || links.length === 0) {
    return renderEmpty(container, 'agcharts-sankey', "Pass <code>{nodes:[{id}], links:[{from,to,size}]}</code>");
  }
  const opts: any = {
    title: title ? { text: title } : undefined,
    series: [{
      type: 'sankey',
      fromKey: 'from',
      toKey: 'to',
      sizeKey: 'size',
    }],
    data: links,
  };
  if (Array.isArray(nodes)) opts.series[0].nodes = nodes;
  return agChart(container, opts);
}
