// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '80px');
  const { Callout } = await loadTremor();
  const { title, body, color = 'blue' } = data;
  return mountReact(container,
    createElement('div', { className: 'p-4' },
      createElement(Callout, { title: title ?? '', color }, body ?? ''),
    ),
  );
}
