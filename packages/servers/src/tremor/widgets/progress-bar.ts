// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '60px');
  const { ProgressBar, Text, Flex } = await loadTremor();
  const { value, label, color = 'blue', showValue = true } = data;
  const children: any[] = [];
  if (label) {
    const header = createElement(Flex, { key: 'h', justifyContent: 'between' },
      createElement(Text, null, label),
      showValue ? createElement(Text, null, `${value}%`) : null,
    );
    children.push(header);
  }
  children.push(createElement(ProgressBar, { key: 'p', value, color, className: 'mt-2' }));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
