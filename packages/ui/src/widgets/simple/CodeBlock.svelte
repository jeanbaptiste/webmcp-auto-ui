<script lang="ts">
  export interface CodeBlockData { lang?: string; content?: string; }
  interface Props { data: Partial<CodeBlockData>; }
  let { data }: Props = $props();
</script>
<div class="rounded overflow-hidden">
  <div class="bg-black/40 px-4 py-1.5 border-b border-white/[0.05]">
    <span class="text-[10px] font-mono text-zinc-600">{data.lang ?? 'text'}</span>
  </div>
  <pre class="font-mono text-xs text-[#a8e6cf] bg-black/30 p-4 overflow-x-auto leading-relaxed">{data.content ?? ''}</pre>
</div>
