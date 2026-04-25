// @ts-nocheck
import {
  DEFAULT_PMTILES_URL,
  createPmtilesMap,
  renderEmpty,
  themedStyle,
} from './shared.js';

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const {
    url = DEFAULT_PMTILES_URL,
    center = [0, 20],
    zoom = 1.5,
    theme = 'light',
  } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-basemap');

  const style = themedStyle(url, theme);
  const { cleanup } = await createPmtilesMap(container, { style, center, zoom });
  return cleanup;
}
