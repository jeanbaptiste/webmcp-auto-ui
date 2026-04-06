<script lang="ts">
  export interface CodeBlockData { lang?: string; content?: string; }
  interface Props { data: Partial<CodeBlockData>; }
  let { data }: Props = $props();
</script>
<div class="rounded overflow-hidden">
  <div class="bg-black/40 px-3 py-1.5 md:px-4 border-b border-border">
    <span class="text-[10px] font-mono text-text2">{data.lang ?? 'text'}</span>
  </div>
  <pre class="font-mono text-xs text-teal bg-black/30 p-3 md:p-4 overflow-x-auto leading-relaxed">{data.content ?? ''}</pre>
</div>
