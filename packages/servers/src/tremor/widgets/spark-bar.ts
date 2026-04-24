// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '80px');
  const { SparkBarChart, Text, Metric, Flex } = await loadTremor();
  const { data: rows, index, categories, colors, title, metric } = data;
  const children: any[] = [];
  const left: any[] = [];
  if (title) left.push(createElement(Text, { key: 't' }, title));
  if (metric !== undefined) left.push(createElement(Metric, { key: 'm' }, String(metric)));
  children.push(createElement(Flex, { key: 'row', alignItems: 'center', justifyContent: 'between' },
    createElement('div', { key: 'l' }, ...left),
    createElement(SparkBarChart, {
      key: 's', data: rows, index, categories, colors,
      className: 'h-10 w-36',
    }),
  ));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
