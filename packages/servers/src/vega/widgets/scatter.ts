// @ts-nocheck
import { renderVegaSpec, baseSize } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { x = [], y = [], size, color, category, title, xLabel, yLabel } = data as any;
  const values = x.map((xv: any, i: number) => ({
    x: xv,
    y: y[i],
    size: Array.isArray(size) ? size[i] : undefined,
    category: Array.isArray(category) ? category[i] : undefined,
  }));
  const enc: any = {
    x: { field: 'x', type: 'quantitative', title: xLabel },
    y: { field: 'y', type: 'quantitative', title: yLabel },
  };
  if (Array.isArray(size)) enc.size = { field: 'size', type: 'quantitative' };
  if (Array.isArray(category)) enc.color = { field: 'category', type: 'nominal' };
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    ...baseSize(),
    title,
    data: { values },
    mark: { type: 'point', filled: true, color: typeof color === 'string' ? color : undefined, opacity: 0.7 },
    encoding: enc,
  };
  return renderVegaSpec(container, spec, { mode: 'vega-lite' });
}
