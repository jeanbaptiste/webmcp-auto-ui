// @ts-nocheck
import { renderVegaSpec } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { words = [], counts = [], title, scheme = 'category20' } = data as any;
  const values = words.map((w: string, i: number) => ({ text: w, count: counts[i] ?? 1 }));
  const spec = {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width: 600,
    height: 400,
    autosize: { type: 'fit', contains: 'padding', resize: true },
    title,
    padding: 0,
    data: [{ name: 'table', values }],
    scales: [
      { name: 'color', type: 'ordinal', domain: { data: 'table', field: 'text' }, range: { scheme } },
    ],
    marks: [
      {
        type: 'text',
        from: { data: 'table' },
        encode: {
          enter: {
            text: { field: 'text' },
            align: { value: 'center' },
            baseline: { value: 'alphabetic' },
            fill: { scale: 'color', field: 'text' },
          },
          update: { fillOpacity: { value: 1 } },
          hover: { fillOpacity: { value: 0.5 } },
        },
        transform: [
          {
            type: 'wordcloud',
            size: [600, 400],
            text: { field: 'text' },
            rotate: { field: 'datum.angle' },
            font: 'Helvetica Neue, Arial',
            fontSize: { field: 'datum.count' },
            fontSizeRange: [12, 56],
            padding: 2,
          },
        ],
      },
    ],
  };
  return renderVegaSpec(container, spec, { mode: 'vega' });
}
