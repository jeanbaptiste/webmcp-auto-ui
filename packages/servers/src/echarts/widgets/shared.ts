// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared ECharts utilities — dark/light adaptive theme, lazy loading, resize
// ---------------------------------------------------------------------------

let _echarts: any = null;

/** Lazy-load echarts (single import, cached). */
export async function loadEcharts(): Promise<any> {
  if (_echarts) return _echarts;
  const mod = await import('echarts');
  _echarts = (mod as any).default ?? mod;
  return _echarts;
}

/**
 * Theme-adaptive base option fragments.
 *
 * ECharts themes are heavyweight — instead we pass a plain object that uses
 * neutral colors (#666 text, #ccc grid) that read correctly on both light
 * and dark backgrounds, mirroring the plotly server pattern.
 */
export function baseTextStyle(): any {
  return { color: '#666', fontSize: 11 };
}

export function baseAxis(): any {
  return {
    axisLine: { lineStyle: { color: '#ccc' } },
    axisTick: { lineStyle: { color: '#ccc' } },
    axisLabel: { color: '#666' },
    splitLine: { lineStyle: { color: '#ccc', type: 'dashed' } },
    nameTextStyle: { color: '#666' },
  };
}

export function baseLegend(): any {
  return { textStyle: { color: '#666' } };
}

export function baseTitle(text?: string): any {
  if (!text) return undefined;
  return { text, textStyle: { color: '#666', fontSize: 13, fontWeight: 'normal' } };
}

/** Default color palette (works on dark & light bg). */
export const PALETTE = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666',
  '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
  '#ea7ccc',
];

/**
 * Create an ECharts instance in `container`, apply `option`, wire a
 * ResizeObserver, and return a cleanup function that disposes the chart.
 */
export async function echarts(
  container: HTMLElement,
  option: any,
): Promise<() => void> {
  const ec = await loadEcharts();

  container.style.width = container.style.width || '100%';
  container.style.height = container.style.height || '100%';
  container.style.minHeight = container.style.minHeight || '360px';

  const chart = ec.init(container, null, { renderer: 'canvas' });
  chart.setOption({
    backgroundColor: 'transparent',
    textStyle: baseTextStyle(),
    color: PALETTE,
    ...option,
  });

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const ro = new ResizeObserver(() => {
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      try {
        chart.resize();
      } catch {
        // chart may be disposed — ignore
      }
    }, 50);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    try {
      chart.dispose();
    } catch {
      // already disposed — ignore
    }
  };
}
