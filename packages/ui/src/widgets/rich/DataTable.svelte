<script lang="ts">
  export interface DataTableColumn { key: string; label: string; align?: 'left'|'center'|'right'; type?: 'text'|'number'|'boolean'|'link'; }
  export interface DataTableSpec { title?: string; columns?: DataTableColumn[]; rows?: Record<string,unknown>[]; compact?: boolean; striped?: boolean; emptyMessage?: string; }
  interface Props { spec: Partial<DataTableSpec>; data?: unknown; onrowclick?: (row: Record<string,unknown>) => void; }
  let { spec, data, onrowclick }: Props = $props();
  const MAX = 200;
  const fmt = new Intl.NumberFormat('fr-FR');
  let sortCol = $state<string|null>(null), sortAsc = $state(true);
  const rows = $derived<Record<string,unknown>[]>(Array.isArray(spec.rows)&&spec.rows.length ? spec.rows as Record<string,unknown>[] : Array.isArray(data) ? data as Record<string,unknown>[] : []);
  const columns = $derived<DataTableColumn[]>(Array.isArray(spec.columns)&&(spec.columns as DataTableColumn[]).length ? spec.columns as DataTableColumn[] : rows.length>0 ? Object.keys(rows[0] as object).map(k=>({key:k,label:k})) : []);
  const sorted = $derived.by<Record<string,unknown>[]>(()=>{
    if (!sortCol) return rows;
    return [...rows].sort((a,b)=>{ const av=a[sortCol!],bv=b[sortCol!],an=Number(av),bn=Number(bv); const c=!isNaN(an)&&!isNaN(bn)?an-bn:String(av??'').localeCompare(String(bv??''),'fr'); return sortAsc?c:-c; });
  });
  const displayed = $derived(sorted.slice(0,MAX));
  const overflow = $derived(rows.length>MAX?rows.length-MAX:0);
  function dv(v: unknown): string { if(v==null)return''; if(typeof v==='object')return JSON.stringify(v); return String(v); }
  const compact = $derived(spec.compact===true);
</script>
<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-text1 mb-3">{spec.title}</h3>{/if}
  {#if columns.length===0&&rows.length===0}
    <p class="text-text2 text-sm">{spec.emptyMessage??'Aucune donnée'}</p>
  {:else}
    <div class="overflow-auto max-h-[480px] rounded border border-border">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            {#each columns as col}
              <th class="sticky top-0 bg-surface2 border-b-2 border-border2 px-3 py-2 text-left text-xs font-mono font-medium text-text2 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-text1 transition-colors {col.align==='center'?'text-center':col.align==='right'?'text-right':''}"
                onclick={()=>{ if(sortCol===col.key){sortAsc=!sortAsc;}else{sortCol=col.key;sortAsc=true;} }}>
                {col.label}{#if sortCol===col.key}<span class="ml-1 text-accent">{sortAsc?'↑':'↓'}</span>{/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each displayed as row, i}
            <tr class="hover:bg-surface2 transition-colors {spec.striped!==false&&i%2===1?'bg-white/[0.02]':''} {onrowclick?'cursor-pointer':''}"
              onclick={()=>onrowclick?.(row)}>
              {#each columns as col}
                {@const val=row[col.key]}
                <td class="border-b border-border text-text1 overflow-hidden text-ellipsis whitespace-nowrap max-w-[280px] {compact?'px-2 py-1 text-xs':'px-3 py-2 text-sm'} {col.align==='center'?'text-center':col.align==='right'?'text-right':''}">
                  {#if val==null}<span class="text-text2">—</span>
                  {:else if col.type==='boolean'}<span>{val?'✓':'✗'}</span>
                  {:else if col.type==='link'&&typeof val==='string'}<a href={val} class="text-accent hover:underline">{val}</a>
                  {:else if typeof val==='object'}<code class="text-xs bg-surface2 px-1 py-0.5 rounded">{JSON.stringify(val)}</code>
                  {:else if typeof val==='number'}<span title={String(val)}>{fmt.format(val)}</span>
                  {:else}{@const s=String(val)}<span title={s}>{s.length>80?s.slice(0,77)+'…':s}</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
          {#if overflow>0}<tr><td colspan={columns.length} class="text-center text-text2 text-xs py-2 px-3">… {overflow} more rows</td></tr>{/if}
        </tbody>
      </table>
    </div>
    <div class="mt-2 text-text2 text-xs">{rows.length} ligne{rows.length!==1?'s':''}</div>
  {/if}
</div>
