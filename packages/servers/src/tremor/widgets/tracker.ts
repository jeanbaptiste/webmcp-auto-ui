// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '80px');
  const { Tracker, Text, Flex } = await loadTremor();
  const { title, data: items, subtitle } = data;
  const children: any[] = [];
  if (title || subtitle) {
    children.push(createElement(Flex, { key: 'h', justifyContent: 'between', className: 'mb-2' },
      title ? createElement(Text, null, title) : null,
      subtitle ? createElement(Text, null, subtitle) : null,
    ));
  }
  children.push(createElement(Tracker, { key: 't', data: items }));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
