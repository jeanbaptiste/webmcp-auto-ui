// @ts-nocheck
import { createMap } from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { center, zoom, rotation } = (data ?? {}) as any;
  const { cleanup } = await createMap(container, { center, zoom, rotation });
  return cleanup;
}
