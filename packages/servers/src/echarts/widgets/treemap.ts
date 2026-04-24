// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { nodes = [], title } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { formatter: (p: any) => `${p.name}: ${p.value}` },
    series: [
      {
        type: 'treemap',
        data: nodes,
        top: title ? 50 : 10,
        left: 10,
        right: 10,
        bottom: 10,
        label: { show: true, formatter: '{b}', color: '#fff' },
        upperLabel: { show: true, height: 24, color: '#666' },
        itemStyle: { borderColor: '#fff', borderWidth: 1, gapWidth: 1 },
        levels: [
          { itemStyle: { borderColor: '#ccc', borderWidth: 2, gapWidth: 2 } },
          { colorSaturation: [0.35, 0.6], itemStyle: { borderColorSaturation: 0.7, gapWidth: 1, borderWidth: 1 } },
        ],
      },
    ],
  };

  return echarts(container, option);
}
