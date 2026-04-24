// @ts-nocheck
import { echarts, baseTitle } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { root, title, orient = 'LR', layout = 'orthogonal' } = data as any;

  const option = {
    title: baseTitle(title),
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'tree',
        data: [root],
        top: title ? '12%' : '5%',
        left: '8%',
        bottom: '5%',
        right: '15%',
        layout,
        orient,
        symbolSize: 8,
        label: {
          position: orient === 'LR' ? 'left' : 'top',
          verticalAlign: 'middle',
          align: 'right',
          color: '#666',
          fontSize: 11,
        },
        leaves: {
          label: {
            position: orient === 'LR' ? 'right' : 'bottom',
            verticalAlign: 'middle',
            align: 'left',
          },
        },
        emphasis: { focus: 'descendant' },
        expandAndCollapse: true,
        animationDuration: 400,
        lineStyle: { color: '#ccc' },
      },
    ],
  };

  return echarts(container, option);
}
