<svelte:options customElement={{ tag: 'auto-code', shadow: 'none' }} />

<script lang="ts">
  export interface CodeData {
    lang?: string;
    content?: string;
  }

  interface Props {
    data?: CodeData | null;
  }

  let { data = {} }: Props = $props();

  const lang = $derived(data?.lang ?? 'text');
  const content = $derived(data?.content ?? '');
</script>

<div class="rounded overflow-hidden">
  <div class="bg-black/40 px-3 py-1.5 md:px-4 border-b border-border">
    <span class="text-[10px] font-mono text-text2">{lang}</span>
  </div>
  <!-- a11y: tabindex + focus-visible for keyboard access to scrollable code block -->
  <pre
    class="font-mono text-xs text-teal bg-black/30 p-3 md:p-4 overflow-x-auto leading-relaxed focus:outline focus:outline-2 focus:outline-accent"
    tabindex="0"
    role="region"
    aria-label="Code block: {lang}"
  >{content}</pre>
</div>
