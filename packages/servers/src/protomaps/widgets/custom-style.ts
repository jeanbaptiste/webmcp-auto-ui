// @ts-nocheck
import { createPmtilesMap, pmtilesUrl, renderEmpty } from './shared.js';

/**
 * Render an arbitrary `.pmtiles` source with a caller-supplied MapLibre style.
 * `style` may be a complete MapLibre style JSON; if it omits the `sources`
 * block (or sets `sources.protomaps.url` to a placeholder), we inject a
 * `protomaps` source pointing to the supplied `url`.
 */
export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const { url, style, center = [0, 20], zoom = 2 } = data as any;

  if (!url) return renderEmpty(container, 'protomaps-custom-style');
  if (!style || typeof style !== 'object') {
    return renderEmpty(
      container,
      'protomaps-custom-style',
      'Pass a MapLibre <code>style</code> JSON object (or a URL string).',
    );
  }

  // Clone & ensure source points at supplied pmtiles
  const finalStyle = JSON.parse(JSON.stringify(style));
  finalStyle.sources = finalStyle.sources ?? {};
  const existing = finalStyle.sources.protomaps;
  finalStyle.sources.protomaps = {
    type: 'vector',
    url: pmtilesUrl(url),
    ...(existing && typeof existing === 'object' ? existing : {}),
  };
  finalStyle.sources.protomaps.url = pmtilesUrl(url);

  const { cleanup } = await createPmtilesMap(container, {
    style: finalStyle,
    center,
    zoom,
  });
  return cleanup;
}
