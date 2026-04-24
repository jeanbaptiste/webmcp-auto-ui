// @ts-nocheck
import { echarts, baseAxis, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { routes = [], title, xLabel, yLabel } = data as any;
  // routes: [{coords:[[x,y],[x,y],...], name?}]

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item' },
    grid: { left: 50, right: 20, top: title ? 60 : 40, bottom: 40, containLabel: true },
    xAxis: { type: 'value', name: xLabel, scale: true, ...baseAxis() },
    yAxis: { type: 'value', name: yLabel, scale: true, ...baseAxis() },
    series: [
      {
        type: 'lines',
        coordinateSystem: 'cartesian2d',
        data: routes,
        polyline: true,
        lineStyle: { width: 2, opacity: 0.6, curveness: 0.2 },
        effect: {
          show: true,
          period: 6,
          trailLength: 0.3,
          symbolSize: 6,
        },
      },
    ],
  };

  return echarts(container, option);
}
