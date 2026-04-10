<script lang="ts">
  import { BlockRenderer, AgentProgress } from '@webmcp-auto-ui/ui';

  interface Block {
    id: string;
    type: string;
    data: Record<string, unknown>;
  }

  interface Props {
    blocks: Block[];
    active: boolean;
    elapsed: number;
    toolCalls: number;
    lastTool: string;
    textOutput: string;
    error: string;
  }

  let { blocks, active, elapsed, toolCalls, lastTool, textOutput, error }: Props = $props();
</script>

<div class="flex flex-col h-full border-t border-border">
  <!-- Header -->
  <div class="flex items-center gap-2 px-3 py-1.5 bg-surface border-b border-border flex-shrink-0">
    <span class="text-[9px] font-mono uppercase tracking-wider text-text2">Preview</span>
    <div class="flex-1"></div>
    <AgentProgress {active} {elapsed} {toolCalls} {lastTool} />
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-3">
    {#if error}
      <div class="font-mono text-xs text-accent2 bg-accent2/10 border border-accent2/20 rounded px-3 py-2">
        {error}
      </div>
    {/if}

    {#if textOutput}
      <div class="font-mono text-xs text-text1 bg-surface2 rounded px-3 py-2 mb-3 border border-border2 whitespace-pre-wrap">
        {textOutput}
      </div>
    {/if}

    {#if blocks.length > 0}
      <div class="flex flex-col gap-2">
        {#each blocks as block (block.id)}
          <div class="block-anim">
            <BlockRenderer type={block.type} data={block.data} />
          </div>
        {/each}
      </div>
    {:else if !active && !textOutput && !error}
      <div class="flex items-center justify-center h-full text-text2 font-mono text-xs">
        Cliquez "Tester" sur une recette pour voir le resultat ici
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes slidein {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .block-anim { animation: slidein .25s ease-out; }
</style>
