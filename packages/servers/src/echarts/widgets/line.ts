// @ts-nocheck
import { echarts, baseAxis, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { categories = [], series = [], title, xLabel, yLabel, smooth = false, area = false, stack } = data as any;

  const seriesList = Array.isArray(series) && series.length && Array.isArray(series[0].data)
    ? series
    : [{ name: 'Value', data: Array.isArray(series) ? series : [] }];

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'axis' },
    legend: { ...baseLegend(), top: title ? 28 : 4 },
    grid: { left: 50, right: 20, top: title ? 60 : 40, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: categories, name: xLabel, boundaryGap: false, ...baseAxis() },
    yAxis: { type: 'value', name: yLabel, ...baseAxis() },
    series: seriesList.map((s: any) => ({
      name: s.name,
      type: 'line',
      smooth,
      data: s.data,
      stack: stack ? (typeof stack === 'string' ? stack : 'total') : undefined,
      areaStyle: area ? { opacity: 0.3 } : undefined,
      emphasis: { focus: 'series' },
    })),
  };

  return echarts(container, option);
}
