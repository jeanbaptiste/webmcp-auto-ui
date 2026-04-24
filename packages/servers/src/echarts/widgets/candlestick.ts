// @ts-nocheck
import { echarts, baseAxis, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { dates = [], ohlc = [], title, name = 'OHLC' } = data as any;

  // ohlc items: [open, close, low, high]
  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { left: 60, right: 20, top: title ? 60 : 40, bottom: 50, containLabel: true },
    xAxis: { type: 'category', data: dates, scale: true, boundaryGap: true, ...baseAxis() },
    yAxis: { type: 'value', scale: true, ...baseAxis() },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 10 }],
    series: [
      {
        name,
        type: 'candlestick',
        data: ohlc,
        itemStyle: {
          color: '#ef4444',
          color0: '#22c55e',
          borderColor: '#ef4444',
          borderColor0: '#22c55e',
        },
      },
    ],
  };

  return echarts(container, option);
}
