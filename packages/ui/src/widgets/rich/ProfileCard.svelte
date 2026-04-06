<script lang="ts">
  export interface ProfileField { label: string; value: string; href?: string; }
  export interface ProfileStat { label: string; value: string; }
  export interface ProfileAction { label: string; href?: string; variant?: 'primary'|'secondary'|'danger'; onclick?: () => void; }
  export interface ProfileSpec { name?: string; subtitle?: string; avatar?: { src: string; alt?: string }; badge?: { text: string; variant?: 'default'|'success'|'warning'|'error' }; fields?: ProfileField[]; stats?: ProfileStat[]; actions?: ProfileAction[]; }
  interface Props { spec: Partial<ProfileSpec>; }
  let { spec }: Props = $props();
  const BADGE: Record<string,string> = { default:'bg-white/10 text-zinc-400', success:'bg-[#3ecfb2]/20 text-[#3ecfb2]', warning:'bg-[#f0a050]/20 text-[#f0a050]', error:'bg-[#fa6d7c]/20 text-[#fa6d7c]' };
  const ACTION: Record<string,string> = { primary:'bg-[#7c6dfa] text-white', secondary:'bg-white/[0.06] text-zinc-400', danger:'bg-[#fa6d7c] text-white' };
  const initials = $derived((spec.name??'?').split(/\s+/).slice(0,2).map((w:string)=>w[0]??'').join('').toUpperCase()||'?');
</script>
<div class="bg-[#13131a] border border-white/[0.07] rounded-lg p-4 font-sans max-w-[480px]">
  <div class="flex items-start mb-4 gap-4">
    {#if spec.avatar?.src}
      <img src={spec.avatar.src} alt={spec.avatar.alt??''} class="w-16 h-16 rounded-full object-cover border-2 border-white/10 flex-shrink-0" />
    {:else}
      <div class="w-16 h-16 rounded-full bg-[#7c6dfa] text-white flex items-center justify-center text-xl font-bold flex-shrink-0">{initials}</div>
    {/if}
    <div>
      <h3 class="text-lg font-bold text-zinc-100 m-0">{spec.name??''}</h3>
      {#if spec.subtitle}<div class="text-sm text-zinc-500 mt-0.5">{spec.subtitle}</div>{/if}
      {#if spec.badge}<div class="mt-1"><span class="text-xs font-semibold px-2 py-0.5 rounded-full {BADGE[spec.badge.variant??'default']??BADGE.default}">{spec.badge.text}</span></div>{/if}
    </div>
  </div>
  {#if spec.fields?.length}
    <dl class="border-t border-white/[0.07] pt-3 m-0">
      {#each spec.fields as f}
        <div class="flex gap-2 mb-1.5">
          <dt class="text-xs text-zinc-600 min-w-[100px] font-mono">{f.label}</dt>
          <dd class="text-sm text-zinc-300 m-0">{#if f.href}<a href={f.href} class="text-[#7c6dfa] hover:underline">{f.value}</a>{:else}{f.value}{/if}</dd>
        </div>
      {/each}
    </dl>
  {/if}
  {#if spec.stats?.length}
    <div class="flex border border-white/[0.07] rounded overflow-hidden mt-3">
      {#each spec.stats as s}<div class="text-center px-4 py-2 border-r border-white/[0.07] last:border-r-0 flex-1"><div class="text-xl font-bold text-[#7c6dfa]">{s.value}</div><div class="text-xs text-zinc-600">{s.label}</div></div>{/each}
    </div>
  {/if}
  {#if spec.actions?.length}
    <div class="flex gap-2 mt-3 flex-wrap">
      {#each spec.actions as a}
        {#if a.href}
          <a href={a.href} class="inline-flex items-center px-3.5 py-1.5 rounded text-xs font-semibold no-underline {ACTION[a.variant??'secondary']??ACTION.secondary}">{a.label}</a>
        {:else}
          <button class="inline-flex items-center px-3.5 py-1.5 rounded text-xs font-semibold border-0 cursor-pointer {ACTION[a.variant??'secondary']??ACTION.secondary}" onclick={a.onclick}>{a.label}</button>
        {/if}
      {/each}
    </div>
  {/if}
</div>
