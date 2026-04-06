<script lang="ts">
  import { Plus, Pencil, Trash2 } from 'lucide-svelte';
  import type { Skill } from '@webmcp-auto-ui/sdk';

  interface Props {
    skills: Skill[];
    onapply: (skill: Skill) => void;
    oncreate: () => void;
    ondelete: (id: string) => void;
    onedit: (skill: Skill) => void;
  }
  let { skills, onapply, oncreate, ondelete, onedit }: Props = $props();
</script>

<div class="px-3 pb-3 flex-1 overflow-y-auto">
  <div class="flex items-center justify-between mb-2">
    <div class="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Recettes</div>
    <button class="text-zinc-600 hover:text-teal transition-colors" onclick={oncreate}><Plus size={12} /></button>
  </div>
  <div class="flex flex-col gap-0.5">
    {#each skills as skill}
      <div class="group flex items-center gap-1 rounded hover:bg-teal/5 border border-transparent hover:border-teal/20 transition-all">
        <button class="flex-1 text-left px-2 py-1.5 text-xs font-mono text-teal hover:text-teal/80 truncate"
          onclick={() => onapply(skill)}>
          ⚡ {skill.name}
        </button>
        <button class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 p-1 transition-opacity" onclick={() => onedit(skill)}><Pencil size={10} /></button>
        <button class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-1 transition-opacity" onclick={() => ondelete(skill.id)}><Trash2 size={10} /></button>
      </div>
    {/each}
  </div>
</div>
