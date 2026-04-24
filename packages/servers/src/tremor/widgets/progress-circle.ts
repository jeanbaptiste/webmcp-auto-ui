// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '180px');
  const { ProgressCircle, Text } = await loadTremor();
  const { value, label, size = 'lg', color = 'blue', radius, strokeWidth } = data;
  const children: any[] = [];
  const inner = createElement('span', { className: 'text-lg font-medium' }, `${value}%`);
  children.push(createElement(ProgressCircle, { key: 'c', value, size, color, radius, strokeWidth }, inner));
  if (label) children.push(createElement(Text, { key: 'l', className: 'mt-3 text-center' }, label));
  return mountReact(container, createElement('div', { className: 'p-4 flex flex-col items-center' }, ...children));
}
