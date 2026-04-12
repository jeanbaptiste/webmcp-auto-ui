<script lang="ts">
  interface Props {
    data: Record<string, unknown>;
    id?: string;
  }
  let { data }: Props = $props();

  const numero = data.numero as string ?? '';
  const article = data.article as string ?? '';
  const auteur = data.auteur as string ?? '';
  const groupe = data.groupe as string ?? '';
  const exposeMotifs = data.exposeMotifs as string ?? '';
  const sort = data.sort as string ?? 'rejete';
  const date = data.date as string ?? '';

  const sortStyles: Record<string, { label: string; cls: string }> = {
    adopte:       { label: 'Adopte',       cls: 'bg-teal/10 text-teal border-teal/20' },
    rejete:       { label: 'Rejete',       cls: 'bg-accent2/10 text-accent2 border-accent2/20' },
    retire:       { label: 'Retire',       cls: 'bg-amber/10 text-amber border-amber/20' },
    non_soutenu:  { label: 'Non soutenu',  cls: 'bg-surface2 text-text2 border-border2' },
  };

  const s = sortStyles[sort] ?? sortStyles.rejete;
</script>

<div class="bg-surface border border-border rounded-xl p-5 block-anim max-w-md">
  <!-- Header -->
  <div class="flex items-start justify-between gap-3 mb-3">
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-mono font-semibold text-text1">Amendement {numero}</span>
        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono border {s.cls}">{s.label}</span>
      </div>
      <p class="text-[11px] text-text2 mt-1">Article {article}</p>
    </div>
  </div>

  <!-- Auteur -->
  <div class="flex items-center gap-2 mb-3 text-xs">
    <span class="text-text1 font-medium">{auteur}</span>
    {#if groupe}
      <span class="text-text2">({groupe})</span>
    {/if}
  </div>

  <!-- Expose des motifs -->
  {#if exposeMotifs}
    <div class="border-t border-border pt-3 mb-3">
      <div class="text-[10px] font-mono text-text2 uppercase tracking-wider mb-1.5">Expose des motifs</div>
      <p class="text-xs text-text1 leading-relaxed line-clamp-4">{exposeMotifs}</p>
    </div>
  {/if}

  <!-- Date -->
  {#if date}
    <div class="text-[10px] font-mono text-text2 text-right">Depose le {date}</div>
  {/if}
</div>
