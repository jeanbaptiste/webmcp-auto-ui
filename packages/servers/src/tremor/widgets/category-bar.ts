// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '80px');
  const { CategoryBar, Text } = await loadTremor();
  const { values, colors, markerValue, label, showLabels = true } = data;
  const children: any[] = [];
  if (label) children.push(createElement(Text, { key: 'l', className: 'mb-2' }, label));
  children.push(createElement(CategoryBar, { key: 'c', values, colors, markerValue, showLabels }));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
