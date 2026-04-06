<script lang="ts">
  export interface CardItem { title: string; description?: string; subtitle?: string; image?: string; tags?: string[]; href?: string; }
  export interface CardsSpec { title?: string; cards?: CardItem[]; minCardWidth?: string; gap?: string; emptyMessage?: string; }
  interface Props { spec: Partial<CardsSpec>; data?: unknown; oncardclick?: (c: CardItem) => void; }
  let { spec, data, oncardclick }: Props = $props();
  const cards=$derived.by<CardItem[]>(()=>{
    if(Array.isArray(spec.cards)&&spec.cards.length) return spec.cards;
    if(Array.isArray(data)) return (data as Record<string,unknown>[]).map(d=>({title:String(d.title??d.name??d.label??JSON.stringify(d)),description:d.description as string|undefined,subtitle:d.subtitle as string|undefined}));
    return [];
  });
</script>
<div class="bg-[#13131a] border border-white/[0.07] rounded-lg p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-zinc-300 mb-3">{spec.title}</h3>{/if}
  {#if cards.length===0}<p class="text-zinc-600 text-sm">{spec.emptyMessage??'Aucun élément'}</p>
  {:else}
    <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax({spec.minCardWidth??'240px'}, 1fr)); gap: {spec.gap??'1rem'};">
      {#each cards as card}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="bg-[#1a1a24] border border-white/[0.07] rounded-lg overflow-hidden hover:border-white/20 transition-all {oncardclick?'cursor-pointer':''}" role={oncardclick?"button":undefined} tabindex={oncardclick?0:undefined} onclick={()=>oncardclick?.(card)}>
          {#if card.image}<img src={card.image} alt={card.title} class="w-full h-32 object-cover"/>{/if}
          <div class="p-3">
            <div class="font-semibold text-sm text-zinc-200 leading-tight">{card.title}</div>
            {#if card.subtitle}<div class="text-xs text-zinc-500 mt-0.5">{card.subtitle}</div>{/if}
            {#if card.description}<div class="text-xs text-zinc-500 mt-1.5 leading-relaxed">{card.description}</div>{/if}
            {#if card.tags?.length}
              <div class="flex gap-1 flex-wrap mt-2">
                {#each card.tags as tag}<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-500">{tag}</span>{/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
