// @ts-nocheck
import { echarts, baseAxis, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { categories = [], series = [], title, xLabel, yLabel, stack, horizontal = false } = data as any;

  // Normalize series: accept [{name, data}] or a single {name?, data:[]}
  const seriesList = Array.isArray(series) && series.length && Array.isArray(series[0].data)
    ? series
    : [{ name: 'Value', data: Array.isArray(series) ? series : [] }];

  const catAxis = { type: 'category', data: categories, name: horizontal ? yLabel : xLabel, ...baseAxis() };
  const valAxis = { type: 'value', name: horizontal ? xLabel : yLabel, ...baseAxis() };

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { ...baseLegend(), top: title ? 28 : 4 },
    grid: { left: 50, right: 20, top: title ? 60 : 40, bottom: 40, containLabel: true },
    xAxis: horizontal ? valAxis : catAxis,
    yAxis: horizontal ? catAxis : valAxis,
    series: seriesList.map((s: any) => ({
      name: s.name,
      type: 'bar',
      stack: stack ? (typeof stack === 'string' ? stack : 'total') : undefined,
      data: s.data,
      emphasis: { focus: 'series' },
    })),
  };

  return echarts(container, option);
}
