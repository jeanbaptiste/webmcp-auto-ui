// @ts-nocheck
import { loadTremor, ensureTailwind, ensureSize, mountReact, createElement } from './shared.js';

export async function render(container: HTMLElement, data: any): Promise<() => void> {
  await ensureTailwind();
  ensureSize(container, '200px');
  const { Card, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Title } = await loadTremor();
  const { rows, columns, title } = data;
  const cols: string[] = columns ?? (rows && rows[0] ? Object.keys(rows[0]) : []);
  const headerRow = createElement(TableRow, { key: 'hr' },
    ...cols.map((c, i) => createElement(TableHeaderCell, { key: `h${i}` }, c)),
  );
  const bodyRows = (rows ?? []).map((r: any, ri: number) =>
    createElement(TableRow, { key: `r${ri}` },
      ...cols.map((c, ci) => createElement(TableCell, { key: `c${ri}-${ci}` }, String(r[c] ?? ''))),
    ),
  );
  const children: any[] = [];
  if (title) children.push(createElement(Title, { key: 'ti', className: 'mb-2' }, title));
  children.push(createElement(Table, { key: 'tb' },
    createElement(TableHead, { key: 'th' }, headerRow),
    createElement(TableBody, { key: 'tbody' }, ...bodyRows),
  ));
  return mountReact(container,
    createElement('div', { className: 'p-4' }, createElement(Card, null, ...children)),
  );
}
