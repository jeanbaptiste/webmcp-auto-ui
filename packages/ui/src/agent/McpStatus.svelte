<script lang="ts">
  interface Props {
    connecting: boolean;
    connected: boolean;
    name: string;
    class?: string;
  }
  let { connecting, connected, name, class: cls = '' }: Props = $props();
</script>

<div class="flex items-center gap-1.5 {cls}">
  <div class="w-1.5 h-1.5 rounded-full {connecting ? 'bg-amber animate-pulse' : connected ? 'bg-teal' : 'bg-text2/30'}"></div>
  <span class="text-[10px] text-text2 font-mono">
    {connecting ? 'connexion…' : connected ? name : 'non connecté'}
  </span>
</div>
