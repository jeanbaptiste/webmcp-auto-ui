<svelte:options customElement={{ tag: 'auto-grid-data', shadow: 'none' }} />

<script lang="ts">
  export interface GridDataColumn { key: string; label: string; width?: string; }
  export interface GridDataHighlight { row: number; col: number; color?: string; }
  export interface GridDataData {
    title?: string;
    columns?: GridDataColumn[];
    rows?: unknown[][];
    highlights?: GridDataHighlight[];
    cellHeight?: number;
  }

  interface Props {
    data?: GridDataData | null;
    oncellclick?: (row: number, col: number, value: unknown) => void;
  }

  let { data = {}, oncellclick }: Props = $props();

  const columns = $derived(Array.isArray(data?.columns) ? data!.columns as GridDataColumn[] : []);
  const rows = $derived(Array.isArray(data?.rows) ? data!.rows as unknown[][] : []);
  const cellH = $derived(data?.cellHeight ?? 32);

  const hlMap = $derived.by(() => {
    const m = new Map<string, string>();
    if (Array.isArray(data?.highlights)) {
      for (const h of data!.highlights as GridDataHighlight[]) {
        m.set(`${h.row},${h.col}`, h.color ?? 'color-mix(in srgb, var(--color-accent) 20%, transparent)');
      }
    }
    return m;
  });

  function bg(r: number, c: number): string {
    return hlMap.get(`${r},${c}`) ?? '';
  }

  function dv(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
</script>

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if data?.title}<h3 class="text-sm font-semibold text-text1 mb-3">{data.title}</h3>{/if}
  {#if !columns.length && !rows.length}
    <p class="text-text2 text-sm">No data</p>
  {:else}
    <div class="overflow-auto rounded border border-border">
      <table class="w-full border-collapse text-xs font-mono" role="grid">
        {#if columns.length}
          <thead>
            <tr>
              {#each columns as col}
                <th
                  class="sticky top-0 bg-surface2 px-3 py-2 text-left text-text2 border-b border-r border-border whitespace-nowrap font-medium"
                  style={col.width ? `width:${col.width}` : ''}
                  scope="col"
                >
                  {col.label}
                </th>
              {/each}
            </tr>
          </thead>
        {/if}
        <tbody>
          {#each rows as row, ri}
            <tr class="hover:bg-surface2">
              {#each (Array.isArray(row) ? row : []) as cell, ci}
                <td
                  class="px-3 text-text2 border-b border-r border-border {oncellclick ? 'cursor-pointer' : ''} hover:bg-surface2"
                  style="height:{cellH}px;{bg(ri, ci) ? `background:${bg(ri, ci)};` : ''}"
                  title={oncellclick ? 'Double-cliquez pour interagir' : undefined}
                  ondblclick={() => oncellclick?.(ri, ci, cell)}
                >{dv(cell)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
