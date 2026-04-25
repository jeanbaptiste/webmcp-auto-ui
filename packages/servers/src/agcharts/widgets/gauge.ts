// @ts-nocheck
import { agChart, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { value, min = 0, max = 100, title } = data as any;
  if (typeof value !== 'number') {
    return renderEmpty(container, 'agcharts-gauge', "Pass <code>{value: 42, min: 0, max: 100}</code>");
  }
  return agChart(container, {
    title: title ? { text: title } : undefined,
    series: [{
      type: 'radial-gauge',
      value,
      scale: { min, max },
    }],
  });
}
