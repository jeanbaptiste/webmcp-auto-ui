// @ts-nocheck
import { echarts, baseAxis, baseLegend, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { points = [], series, title, xLabel, yLabel, symbolSize = 10 } = data as any;

  // Accept either flat points [[x,y], ...] or multi-series [{name, data:[[x,y,size?],...]}, ...]
  const seriesList = Array.isArray(series) && series.length
    ? series
    : [{ name: 'Points', data: points }];

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item' },
    legend: { ...baseLegend(), top: title ? 28 : 4 },
    grid: { left: 50, right: 20, top: title ? 60 : 40, bottom: 40, containLabel: true },
    xAxis: { type: 'value', name: xLabel, scale: true, ...baseAxis() },
    yAxis: { type: 'value', name: yLabel, scale: true, ...baseAxis() },
    series: seriesList.map((s: any) => ({
      name: s.name ?? 'Points',
      type: 'scatter',
      data: s.data,
      symbolSize: (val: any) => (Array.isArray(val) && val[2] != null ? val[2] : symbolSize),
    })),
  };

  return echarts(container, option);
}
