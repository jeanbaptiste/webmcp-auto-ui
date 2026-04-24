// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '80px');
  const { Title, Subtitle, Text } = await loadTremor();
  const { title, subtitle, body } = data;
  const children: any[] = [];
  if (title) children.push(createElement(Title, { key: 'ti' }, title));
  if (subtitle) children.push(createElement(Subtitle, { key: 'su', className: 'mt-1' }, subtitle));
  if (body) children.push(createElement(Text, { key: 'b', className: 'mt-2' }, body));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
