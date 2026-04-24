// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '200px');
  const { BarList, Title } = await loadTremor();
  const { data: items, title, color, sortOrder = 'descending' } = data;
  const children: any[] = [];
  if (title) children.push(createElement(Title, { key: 't' }, title));
  children.push(createElement(BarList, { key: 'b', data: items, color, sortOrder, className: 'mt-2' }));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
