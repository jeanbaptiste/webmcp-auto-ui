<script lang="ts">
  export interface GridDataColumn { key: string; label: string; width?: string; }
  export interface GridDataHighlight { row: number; col: number; color?: string; }
  export interface GridDataSpec { title?: string; columns?: GridDataColumn[]; rows?: unknown[][]; highlights?: GridDataHighlight[]; cellHeight?: number; }
  interface Props { spec: Partial<GridDataSpec>; oncellclick?: (row: number, col: number, value: unknown) => void; }
  let { spec, oncellclick }: Props = $props();
  const columns=$derived(Array.isArray(spec.columns)?spec.columns:[]);
  const rows=$derived(Array.isArray(spec.rows)?spec.rows:[]);
  const cellH=$derived(spec.cellHeight??32);
  const hlMap=$derived(()=>{const m=new Map<string,string>();if(Array.isArray(spec.highlights))for(const h of spec.highlights)m.set(`${h.row},${h.col}`,h.color??'color-mix(in srgb, var(--color-accent) 20%, transparent)');return m;});
  function bg(r:number,c:number):string{return hlMap().get(`${r},${c}`)??'';}
  function dv(v:unknown):string{if(v==null)return'';if(typeof v==='object')return JSON.stringify(v);return String(v);}
</script>
<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-text1 mb-3">{spec.title}</h3>{/if}
  {#if !columns.length&&!rows.length}<p class="text-text2 text-sm">Aucune donnée</p>
  {:else}
    <div class="overflow-auto rounded border border-border">
      <table class="w-full border-collapse text-xs font-mono">
        {#if columns.length}
          <thead>
            <tr>
              {#each columns as col}<th class="sticky top-0 bg-surface2 px-3 py-2 text-left text-text2 border-b border-r border-border whitespace-nowrap font-medium" style={col.width?`width:${col.width}`:''}>
                {col.label}
              </th>{/each}
            </tr>
          </thead>
        {/if}
        <tbody>
          {#each rows as row, ri}
            <tr class="hover:bg-surface2">
              {#each (Array.isArray(row)?row:[]) as cell, ci}
                <td class="px-3 text-text2 border-b border-r border-border cursor-pointer hover:bg-surface2"
                  style="height:{cellH}px;{bg(ri,ci)?`background:${bg(ri,ci)};`:''}"
                  onclick={()=>oncellclick?.(ri,ci,cell)}>{dv(cell)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
