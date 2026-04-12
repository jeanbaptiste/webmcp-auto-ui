<script lang="ts">
  interface Props {
    data: Record<string, unknown>;
    id?: string;
  }
  let { data }: Props = $props();

  const titre = data.titre as string ?? '';
  const numero = data.numero as number | undefined;
  const date = data.date as string ?? '';
  const pour = data.pour as number ?? 0;
  const contre = data.contre as number ?? 0;
  const abstentions = data.abstentions as number ?? 0;
  const votants = data.votants as number ?? (pour + contre + abstentions);
  const adopte = data.adopte as boolean ?? (pour > contre);
  const total = pour + contre + abstentions;
</script>

<div class="bg-surface border border-border rounded-xl p-5 block-anim max-w-md">
  <!-- Header -->
  <div class="flex items-start justify-between gap-3 mb-3">
    <div class="flex-1 min-w-0">
      {#if numero}
        <span class="text-[10px] font-mono text-text2">Scrutin n&deg;{numero}</span>
      {/if}
      <h3 class="text-sm font-semibold text-text1 leading-snug mt-0.5">{titre}</h3>
      {#if date}
        <p class="text-[10px] font-mono text-text2 mt-1">{date}</p>
      {/if}
    </div>
    <span class="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold flex-shrink-0
                 {adopte ? 'bg-teal/10 text-teal border border-teal/20' : 'bg-accent2/10 text-accent2 border border-accent2/20'}">
      {adopte ? 'Adopte' : 'Rejete'}
    </span>
  </div>

  <!-- Vote bar -->
  {#if total > 0}
    <div class="mb-3">
      <div class="flex h-3 rounded-full overflow-hidden bg-surface2">
        <div class="bg-teal transition-all" style="width: {(pour / total * 100).toFixed(1)}%"></div>
        <div class="bg-accent2 transition-all" style="width: {(contre / total * 100).toFixed(1)}%"></div>
        {#if abstentions > 0}
          <div class="bg-amber transition-all" style="width: {(abstentions / total * 100).toFixed(1)}%"></div>
        {/if}
      </div>
    </div>

    <!-- Legend -->
    <div class="grid grid-cols-3 gap-2 text-center">
      <div>
        <div class="text-lg font-bold text-teal">{pour}</div>
        <div class="text-[10px] font-mono text-text2">Pour</div>
      </div>
      <div>
        <div class="text-lg font-bold text-accent2">{contre}</div>
        <div class="text-[10px] font-mono text-text2">Contre</div>
      </div>
      <div>
        <div class="text-lg font-bold text-amber">{abstentions}</div>
        <div class="text-[10px] font-mono text-text2">Abstentions</div>
      </div>
    </div>
  {/if}

  <!-- Votants -->
  {#if votants > 0}
    <div class="border-t border-border mt-3 pt-2 text-[10px] font-mono text-text2 text-center">
      {votants} votants
    </div>
  {/if}
</div>
