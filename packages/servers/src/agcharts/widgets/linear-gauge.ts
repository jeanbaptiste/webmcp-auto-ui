// @ts-nocheck
import { agChart, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { value, min = 0, max = 100, title, direction = 'horizontal' } = data as any;
  if (typeof value !== 'number') {
    return renderEmpty(container, 'agcharts-linear-gauge', "Pass <code>{value: 42, min: 0, max: 100}</code>");
  }
  return agChart(container, {
    title: title ? { text: title } : undefined,
    series: [{
      type: 'linear-gauge',
      value,
      direction,
      scale: { min, max },
    }],
  });
}
