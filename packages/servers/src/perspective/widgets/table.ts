// @ts-nocheck
import { mountViewer, toArr } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { columns, sort, filter, title } = data as any;
  return mountViewer(container, data, 'perspective-table', {
    plugin: 'Datagrid',
    title,
    columns: columns ? toArr(columns) : undefined,
    sort,
    filter,
  });
}
