// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '60px');
  const { BadgeDelta } = await loadTremor();
  const { text, deltaType = 'moderateIncrease', size = 'md' } = data;
  return mountReact(container,
    createElement('div', { className: 'p-4' },
      createElement(BadgeDelta, { deltaType, size }, text ?? ''),
    ),
  );
}
