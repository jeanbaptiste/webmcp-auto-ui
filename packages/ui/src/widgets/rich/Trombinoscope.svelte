<script lang="ts">
  export interface TrombinoscopePerson { name: string; subtitle?: string; avatar?: string; badge?: string; color?: string; badgeColor?: string; }
  export interface TrombinoscopeSpec { title?: string; people?: TrombinoscopePerson[]; columns?: number; showBadge?: boolean; }
  interface Props { spec: Partial<TrombinoscopeSpec>; data?: unknown; onpersonclick?: (p: TrombinoscopePerson) => void; }
  let { spec, data, onpersonclick }: Props = $props();
  const COLORS = ['#7c6dfa','#3ecfb2','#f0a050','#fa6d7c','#3b82f6','#a855f7','#14b8a6','#f97316'];
  const VALID_PREFIXES = ['http://', 'https://', 'data:', '/'];
  function isValidImageUrl(url: string | undefined): boolean { return !!url && VALID_PREFIXES.some(p => url.startsWith(p)); }
  function nameColor(name: string): string { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; }
  function initials(name: string): string { return name.split(/\s+/).slice(0,2).map((w:string)=>w[0]??'').join('').toUpperCase()||'?'; }
  /** Track per-person avatar load failures to fall back to initials */
  let failedAvatars = $state(new Set<string>());
  const people = $derived.by<TrombinoscopePerson[]>(()=>{ if(Array.isArray(spec.people)&&spec.people.length) return spec.people; if(Array.isArray(data)) return data as TrombinoscopePerson[]; return []; });
  const cols = $derived(spec.columns??4);
</script>
<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans">
  {#if spec.title}<h3 class="text-sm font-semibold text-text1 mb-3">{spec.title}</h3>{/if}
  {#if people.length===0}<p class="text-text2 text-sm">Aucune personne</p>
  {:else}
    <div class="grid gap-3 responsive-trombi" style="--trombi-cols: repeat({cols}, minmax(0, 1fr));">
      {#each people as person}
        {@const accent=person.color??nameColor(person.name)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="flex flex-col items-center text-center p-3 rounded-lg border border-border hover:border-border2 transition-all {onpersonclick?'cursor-pointer':''}" role={onpersonclick?"button":undefined} tabindex={onpersonclick?0:undefined} onclick={()=>onpersonclick?.(person)}>
          {#if isValidImageUrl(person.avatar) && !failedAvatars.has(person.avatar!)}
            <img src={person.avatar} alt={person.name} class="w-12 h-12 rounded-full object-cover mb-2 border-2" style="border-color:{accent};" onerror={() => { failedAvatars = new Set([...failedAvatars, person.avatar!]); }} />
          {:else}
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base mb-2 flex-shrink-0" style="background:{accent};">{initials(person.name)}</div>
          {/if}
          <div class="text-xs font-semibold text-text1 leading-tight truncate w-full">{person.name}</div>
          {#if person.subtitle}<div class="text-xs text-text2 mt-0.5 truncate w-full">{person.subtitle}</div>{/if}
          {#if spec.showBadge!==false&&person.badge}
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5 text-white" style="background:{person.badgeColor??accent};">{person.badge}</span>
          {/if}
        </div>
      {/each}
    </div>
    <div class="mt-3 text-xs text-text2">{people.length} personne{people.length!==1?'s':''}</div>
  {/if}
</div>

<style>
  .responsive-trombi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 768px) { .responsive-trombi { grid-template-columns: var(--trombi-cols); } }
</style>
