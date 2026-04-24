// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '120px');
  const { Card, Metric, Text, BadgeDelta, Flex } = await loadTremor();
  const { title, metric, delta, deltaType = 'moderateIncrease', subtitle } = data;
  const topChildren: any[] = [createElement(Text, { key: 't' }, title ?? '')];
  if (delta !== undefined && delta !== null) {
    topChildren.push(createElement(BadgeDelta, { key: 'b', deltaType }, String(delta)));
  }
  const cardChildren: any[] = [
    createElement(Flex, { key: 'f', alignItems: 'start', justifyContent: 'between' }, ...topChildren),
    createElement(Metric, { key: 'm', className: 'mt-2' }, String(metric ?? '')),
  ];
  if (subtitle) cardChildren.push(createElement(Text, { key: 's', className: 'mt-2 text-sm' }, subtitle));
  return mountReact(container, createElement('div', { className: 'p-4' }, createElement(Card, null, ...cardChildren)));
}
