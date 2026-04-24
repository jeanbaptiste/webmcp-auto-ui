// @ts-nocheck
import { loadPlot, renderPlot, commonOpts } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const d: any = data;
  const paths: string[] = d.paths ?? [];
  const delimiter = d.delimiter ?? '/';
  const opts: any = { delimiter };
  if (d.stroke) opts.stroke = d.stroke;
  if (d.fill) opts.fill = d.fill;
  return renderPlot(container, () => ({
    ...commonOpts(d),
    marks: [Plot.tree(paths, opts)],
  }));
}
