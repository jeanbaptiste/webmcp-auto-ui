<svelte:options customElement={{ tag: 'auto-profile', shadow: 'none' }} />

<script lang="ts">
  export interface ProfileField { label: string; value: string; href?: string; }
  export interface ProfileStat { label: string; value: string; }
  export interface ProfileAction { label: string; href?: string; variant?: 'primary' | 'secondary' | 'danger'; onclick?: () => void; }
  export interface ProfileData {
    name?: string;
    subtitle?: string;
    avatar?: { src: string; alt?: string };
    badge?: { text: string; variant?: 'default' | 'success' | 'warning' | 'error' };
    fields?: ProfileField[];
    stats?: ProfileStat[];
    actions?: ProfileAction[];
  }

  interface Props { data?: ProfileData | null; }
  let { data = {} }: Props = $props();

  const VALID_PREFIXES = ['http://', 'https://', 'data:', '/'];

  /** Track if avatar failed to load — fall back to initials */
  let avatarFailed = $state(false);
  $effect(() => { if (data?.avatar?.src) avatarFailed = false; });

  const avatarValid = $derived(
    !!data?.avatar?.src && VALID_PREFIXES.some(p => data!.avatar!.src.startsWith(p))
  );

  const BADGE: Record<string, string> = {
    default: 'bg-surface2 text-text2',
    success: 'bg-teal/20 text-teal',
    warning: 'bg-amber/20 text-amber',
    error: 'bg-accent2/20 text-accent2',
  };
  const ACTION: Record<string, string> = {
    primary: 'bg-accent text-white',
    secondary: 'bg-surface2 text-text2',
    danger: 'bg-accent2 text-white',
  };

  const initials = $derived(
    (data?.name ?? '?').split(/\s+/).slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase() || '?'
  );
</script>

<div class="bg-surface border border-border rounded-lg p-3 md:p-4 font-sans max-w-full md:max-w-[480px]">
  <div class="flex flex-col sm:flex-row items-center sm:items-start mb-4 gap-3 sm:gap-4">
    {#if avatarValid && !avatarFailed}
      <img src={data?.avatar?.src} alt={data?.avatar?.alt ?? ''} class="w-16 h-16 rounded-full object-cover border-2 border-border2 flex-shrink-0" onerror={() => { avatarFailed = true; }} />
    {:else}
      <div class="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold flex-shrink-0">{initials}</div>
    {/if}
    <div>
      <h3 class="text-lg font-bold text-text1 m-0">{data?.name ?? ''}</h3>
      {#if data?.subtitle}<div class="text-sm text-text2 mt-0.5">{data.subtitle}</div>{/if}
      {#if data?.badge}<div class="mt-1"><span class="text-xs font-semibold px-2 py-0.5 rounded-full {BADGE[data.badge.variant ?? 'default'] ?? BADGE.default}">{data.badge.text}</span></div>{/if}
    </div>
  </div>
  {#if data?.fields?.length}
    <dl class="border-t border-border pt-3 m-0">
      {#each data.fields as f}
        <div class="flex gap-2 mb-1.5">
          <dt class="text-xs text-text2 min-w-[80px] sm:min-w-[100px] font-mono">{f.label}</dt>
          <dd class="text-sm text-text1 m-0">{#if f.href}<a href={f.href} class="text-accent hover:underline">{f.value}</a>{:else}{f.value}{/if}</dd>
        </div>
      {/each}
    </dl>
  {/if}
  {#if data?.stats?.length}
    <div class="flex flex-wrap border border-border rounded overflow-hidden mt-3">
      {#each data.stats as s}
        <div class="text-center px-4 py-2 border-r border-border last:border-r-0 flex-1 min-w-[80px]">
          <div class="text-xl font-bold text-accent">{s.value}</div>
          <div class="text-xs text-text2">{s.label}</div>
        </div>
      {/each}
    </div>
  {/if}
  {#if data?.actions?.length}
    <div class="flex gap-2 mt-3 flex-wrap">
      {#each data.actions as a}
        {#if a.href}
          <a href={a.href} class="inline-flex items-center px-3.5 py-1.5 rounded text-xs font-semibold no-underline {ACTION[a.variant ?? 'secondary'] ?? ACTION.secondary}">{a.label}</a>
        {:else}
          <button class="inline-flex items-center px-3.5 py-1.5 rounded text-xs font-semibold border-0 cursor-pointer {ACTION[a.variant ?? 'secondary'] ?? ACTION.secondary}" onclick={a.onclick}>{a.label}</button>
        {/if}
      {/each}
    </div>
  {/if}
</div>
