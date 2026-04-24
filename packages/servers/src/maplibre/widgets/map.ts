// @ts-nocheck
import { createMap, DEFAULT_STYLE, DARK_STYLE, POSITRON_STYLE } from './shared.js';

const STYLE_ALIASES: Record<string, string> = {
  voyager: DEFAULT_STYLE,
  dark: DARK_STYLE,
  positron: POSITRON_STYLE,
};

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { center = [2.3522, 48.8566], zoom = 5, style = 'voyager', pitch = 0, bearing = 0 } = data as any;
  const resolvedStyle = typeof style === 'string' && STYLE_ALIASES[style] ? STYLE_ALIASES[style] : style;
  const { cleanup } = await createMap(container, { center, zoom, style: resolvedStyle, pitch, bearing });
  return cleanup;
}
