// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '80px');
  const { Metric, Text, Title, Subtitle } = await loadTremor();
  const { title, subtitle, value, description } = data;
  const children: any[] = [];
  if (title) children.push(createElement(Title, { key: 'ti' }, title));
  if (subtitle) children.push(createElement(Subtitle, { key: 'su' }, subtitle));
  children.push(createElement(Metric, { key: 'm', className: 'mt-2' }, String(value ?? '')));
  if (description) children.push(createElement(Text, { key: 'd', className: 'mt-1' }, description));
  return mountReact(container, createElement('div', { className: 'p-4' }, ...children));
}
