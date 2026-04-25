// @ts-nocheck
// Generic CSV import — pass raw CSV string and let kepler infer columns.
import { loadKepler, mountKepler, renderEmpty } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const csv = (data as any).csv as string | undefined;
  if (!csv || typeof csv !== 'string') {
    return renderEmpty(container, 'kepler-csv-import', 'Pass {csv: "lat,lng,...\\n..."} as raw CSV string.');
  }

  let dataset: any;
  try {
    const mods = await loadKepler();
    dataset = {
      info: { id: 'csv', label: (data as any).label ?? 'CSV' },
      data: mods.processCsvData(csv),
    };
  } catch (err) {
    return renderEmpty(container, 'kepler-csv-import', `processCsvData failed: ${(err as Error).message}`);
  }

  // Let kepler auto-build a default layer (no config supplied).
  return mountKepler(container, 'kepler-csv-import', { datasets: dataset, options: { centerMap: true, readOnly: false } });
}
