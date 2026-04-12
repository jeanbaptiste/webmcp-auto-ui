<script lang="ts">
  interface Props {
    data: Record<string, unknown>;
    id?: string;
  }
  let { data }: Props = $props();

  const nom = data.nom as string ?? '';
  const prenom = data.prenom as string ?? '';
  const photo = data.photo as string | undefined;
  const groupe = data.groupe as string ?? '';
  const groupeCouleur = data.groupeCouleur as string ?? '#6b7280';
  const circonscription = data.circonscription as string ?? '';
  const mandatDebut = data.mandatDebut as string ?? '';
  const mandatFin = data.mandatFin as string ?? '';
  const actif = data.actif as boolean ?? true;
  const participation = data.participation as number | undefined;
  const votePour = data.votePour as number ?? 0;
  const voteContre = data.voteContre as number ?? 0;
  const voteAbstention = data.voteAbstention as number ?? 0;
  const totalVotes = votePour + voteContre + voteAbstention;
</script>

<div class="bg-surface border border-border rounded-xl p-5 block-anim max-w-sm">
  <!-- Header -->
  <div class="flex items-start gap-4 mb-4">
    {#if photo}
      <img src={photo} alt="{prenom} {nom}"
        class="w-16 h-16 rounded-full object-cover border-2 border-border2 flex-shrink-0" />
    {:else}
      <div class="w-16 h-16 rounded-full bg-surface2 border-2 border-border2 flex-shrink-0
                  flex items-center justify-center text-text2 font-bold text-lg">
        {prenom.charAt(0)}{nom.charAt(0)}
      </div>
    {/if}
    <div class="flex-1 min-w-0">
      <h3 class="text-base font-semibold text-text1 leading-tight">{prenom} {nom}</h3>
      <div class="flex items-center gap-2 mt-1">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: {groupeCouleur}"></span>
        <span class="text-xs text-text2 truncate">{groupe}</span>
      </div>
      {#if circonscription}
        <p class="text-[11px] text-text2 mt-1">{circonscription}</p>
      {/if}
    </div>
    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono flex-shrink-0
                 {actif ? 'bg-teal/10 text-teal border border-teal/20' : 'bg-surface2 text-text2 border border-border2'}">
      {actif ? 'Actif' : 'Inactif'}
    </span>
  </div>

  <!-- Mandat -->
  {#if mandatDebut}
    <div class="text-[10px] font-mono text-text2 mb-3 px-1">
      Mandat : {mandatDebut}{mandatFin ? ` — ${mandatFin}` : ' — en cours'}
    </div>
  {/if}

  <!-- Participation -->
  {#if participation != null}
    <div class="mb-3">
      <div class="flex justify-between text-[10px] font-mono text-text2 mb-1">
        <span>Participation</span>
        <span>{participation.toFixed(1)} %</span>
      </div>
      <div class="h-1.5 bg-surface2 rounded-full overflow-hidden">
        <div class="h-full bg-accent rounded-full transition-all" style="width: {Math.min(participation, 100)}%"></div>
      </div>
    </div>
  {/if}

  <!-- Votes -->
  {#if totalVotes > 0}
    <div class="border-t border-border pt-3">
      <div class="text-[10px] font-mono text-text2 mb-2">Votes ({totalVotes})</div>
      <div class="flex h-2 rounded-full overflow-hidden bg-surface2">
        <div class="bg-teal transition-all" style="width: {(votePour / totalVotes * 100).toFixed(1)}%"
             title="Pour: {votePour}"></div>
        <div class="bg-accent2 transition-all" style="width: {(voteContre / totalVotes * 100).toFixed(1)}%"
             title="Contre: {voteContre}"></div>
        <div class="bg-amber transition-all" style="width: {(voteAbstention / totalVotes * 100).toFixed(1)}%"
             title="Abstention: {voteAbstention}"></div>
      </div>
      <div class="flex justify-between mt-1.5 text-[10px] font-mono">
        <span class="text-teal">{votePour} pour</span>
        <span class="text-accent2">{voteContre} contre</span>
        <span class="text-amber">{voteAbstention} abst.</span>
      </div>
    </div>
  {/if}
</div>
