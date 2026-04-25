// @ts-nocheck
import { mountViewer, toArr } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { group_by, split_by, columns, aggregates, title } = data as any;
  return mountViewer(container, data, 'perspective-area', {
    plugin: 'Y Area',
    title,
    group_by: toArr(group_by),
    split_by: toArr(split_by),
    columns: columns ? toArr(columns) : undefined,
    aggregates,
  });
}
