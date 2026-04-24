// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '40px');
  const { Legend } = await loadTremor();
  const { categories, colors } = data;
  return mountReact(container,
    createElement('div', { className: 'p-4' },
      createElement(Legend, { categories: categories ?? [], colors }),
    ),
  );
}
