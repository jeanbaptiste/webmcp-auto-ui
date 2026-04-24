<svelte:options customElement={{ tag: 'auto-alert', shadow: 'none' }} />

<script lang="ts">
  export interface AlertData {
    title?: string;
    message?: string;
    level?: 'info' | 'warn' | 'error';
  }

  interface Props {
    data?: AlertData | null;
  }

  let { data = {} }: Props = $props();

  const title = $derived(data?.title);
  const message = $derived(data?.message);
  const level = $derived(data?.level ?? 'warn');

  const borderColor = $derived(
    level === 'error'
      ? 'border-accent2'
      : level === 'info'
        ? 'border-blue-500'
        : 'border-amber',
  );
  const titleColor = $derived(
    level === 'error'
      ? 'text-accent2'
      : level === 'info'
        ? 'text-blue-400'
        : 'text-amber',
  );

  // a11y: error/warn → role="alert" + aria-live="assertive"
  //       info → role="status" + aria-live="polite"
  const role = $derived(level === 'error' || level === 'warn' ? 'alert' : 'status');
  const ariaLive = $derived(level === 'error' || level === 'warn' ? 'assertive' : 'polite');
</script>

<div
  class="p-3 md:p-4 border-l-4 {borderColor}"
  role={role}
  aria-live={ariaLive}
>
  {#if title}
    <div class="font-semibold text-sm mb-1 {titleColor}">{title}</div>
  {/if}
  {#if message}
    <div class="text-xs font-mono text-text2">{message}</div>
  {/if}
</div>
