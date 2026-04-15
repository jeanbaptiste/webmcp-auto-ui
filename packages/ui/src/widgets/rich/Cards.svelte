<script lang="ts">
  import SafeImage from '../SafeImage.svelte';
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
<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-text1 mb-3">{spec.title}</h3>{/if}
  {#if cards.length===0}<p class="text-text2 text-sm">{spec.emptyMessage??'No items'}</p>
  {:else}
    <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax({spec.minCardWidth??'180px'}, 1fr)); gap: {spec.gap??'1rem'};">
      {#each cards as card}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="bg-surface2 border border-border rounded-lg overflow-hidden hover:border-border2 transition-all {oncardclick?'cursor-pointer':''}" role={oncardclick?"button":undefined} tabindex={oncardclick?0:undefined} title={oncardclick?"Double-cliquez pour interagir":undefined} ondblclick={()=>oncardclick?.(card)}>
          {#if card.image}<SafeImage src={card.image} alt={card.title} class="w-full h-32 object-cover" hideOnError />{/if}
          <div class="p-3">
            <div class="font-semibold text-sm text-text1 leading-tight">{card.title}</div>
            {#if card.subtitle}<div class="text-xs text-text2 mt-0.5">{card.subtitle}</div>{/if}
            {#if card.description}<div class="text-xs text-text2 mt-1.5 leading-relaxed">{card.description}</div>{/if}
            {#if card.tags?.length}
              <div class="flex gap-1 flex-wrap mt-2">
                {#each card.tags as tag}<span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface2 text-text2">{tag}</span>{/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
