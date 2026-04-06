<script lang="ts">
  export interface TextBlockData { content?: string; }
  interface Props { data: Partial<TextBlockData>; }
  let { data }: Props = $props();
</script>
<div class="p-5 text-sm text-zinc-400 leading-relaxed">{data.content ?? ''}</div>
