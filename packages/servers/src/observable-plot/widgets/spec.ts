// @ts-nocheck
// Generic widget : accept a full Plot spec (marks + options).
// The LLM can pass any Observable Plot configuration. Marks are accepted as
// an array of {type, data, options} tuples, mapped to Plot.<type>(data, options).
import { loadPlot, renderPlot, commonOpts } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const Plot = await loadPlot();
  const d: any = data;
  const markDescriptors: any[] = d.marks ?? [];
  const built = markDescriptors
    .map((m: any) => {
      if (!m || typeof m !== 'object') return null;
      const fn = Plot[m.type];
      if (typeof fn !== 'function') return null;
      if (m.data !== undefined) return fn(m.data, m.options ?? {});
      return fn(m.options ?? {});
    })
    .filter(Boolean);
  return renderPlot(container, () => ({
    ...commonOpts(d),
    ...(d.plot ?? {}),
    marks: built,
  }));
}
