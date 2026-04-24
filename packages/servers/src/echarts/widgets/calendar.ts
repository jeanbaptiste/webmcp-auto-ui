// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { values = [], year, title, min, max } = data as any;
  // values: [["yyyy-mm-dd", value], ...]

  const yr = year ?? (values[0]?.[0]?.slice(0, 4) ?? String(new Date().getFullYear()));
  const nums = values.map((v: any[]) => v[1]).filter((n: number) => Number.isFinite(n));
  const computedMin = min ?? (nums.length ? Math.min(...nums) : 0);
  const computedMax = max ?? (nums.length ? Math.max(...nums) : 1);

  const option = {
    title: baseTitle(title),
    tooltip: { formatter: (p: any) => `${p.value[0]}: ${p.value[1]}` },
    visualMap: {
      min: computedMin,
      max: computedMax,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      textStyle: { color: '#666' },
      inRange: { color: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] },
    },
    calendar: {
      top: title ? 70 : 40,
      left: 50,
      right: 30,
      cellSize: ['auto', 14],
      range: String(yr),
      itemStyle: { borderWidth: 0.5, borderColor: '#fff' },
      yearLabel: { show: true, color: '#666' },
      monthLabel: { color: '#666' },
      dayLabel: { color: '#666' },
      splitLine: { show: false },
    },
    series: [
      { type: 'heatmap', coordinateSystem: 'calendar', data: values },
    ],
  };

  return echarts(container, option);
}
