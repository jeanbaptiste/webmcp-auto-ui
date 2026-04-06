<script lang="ts">
  import { onMount } from 'svelte';
  import { createToolGroup, textResult, jsonResult } from '@webmcp-auto-ui/core';
  import { StatCard, DataTable } from '@webmcp-auto-ui/ui';
  import { Check, Trash2, Plus, Circle } from 'lucide-svelte';

  interface Todo {
    id: string; text: string; done: boolean;
    priority: 'low'|'normal'|'high'; createdAt: number; tags: string[];
  }

  let todos = $state<Todo[]>([
    { id: 't1', text: 'Activer WebMCP dans chrome://flags', done: false, priority: 'high', createdAt: Date.now()-3600000, tags: ['setup'] },
    { id: 't2', text: 'Installer l\'extension Model Context Tool Inspector', done: false, priority: 'high', createdAt: Date.now()-1800000, tags: ['setup'] },
    { id: 't3', text: 'Tester les outils WebMCP dans l\'extension', done: false, priority: 'normal', createdAt: Date.now()-900000, tags: ['test'] },
    { id: 't4', text: 'Explorer HyperSkills Composer', done: false, priority: 'normal', createdAt: Date.now()-300000, tags: ['explore'] },
    { id: 't5', text: 'Lire la documentation WebMCP W3C', done: true, priority: 'low', createdAt: Date.now()-7200000, tags: ['docs'] },
  ]);

  let input = $state('');
  let filter = $state<'all'|'active'|'done'>('all');
  let newPriority = $state<'low'|'normal'|'high'>('normal');

  function uid() { return 't'+Math.random().toString(36).slice(2,8)+Date.now().toString(36); }

  function addTodo(text: string, priority: Todo['priority']='normal', tags: string[]=[]) {
    const t: Todo = { id: uid(), text, done: false, priority, createdAt: Date.now(), tags };
    todos = [...todos, t]; return t;
  }
  function toggleTodo(id: string) { todos = todos.map(t => t.id===id ? {...t,done:!t.done} : t); return todos.find(t=>t.id===id) ?? null; }
  function deleteTodo(id: string) { const had=todos.some(t=>t.id===id); todos=todos.filter(t=>t.id!==id); return had; }
  function updateTodo(id: string, patch: Partial<Omit<Todo,'id'|'createdAt'>>) { let found: Todo|null=null; todos=todos.map(t=>{if(t.id===id){found={...t,...patch};return found;}return t;}); return found; }
  function clearDone() { const n=todos.filter(t=>t.done).length; todos=todos.filter(t=>!t.done); return n; }

  const PRIORITY_COLOR: Record<string,string> = { high:'text-red-400', normal:'text-zinc-300', low:'text-zinc-600' };
  const PRIORITY_DOT: Record<string,string> = { high:'bg-red-400', normal:'bg-zinc-400', low:'bg-zinc-700' };

  const filtered = $derived(todos.filter(t =>
    filter==='all' ? true : filter==='active' ? !t.done : t.done
  ));

  const stats = $derived({
    total: todos.length,
    active: todos.filter(t=>!t.done).length,
    done: todos.filter(t=>t.done).length,
    high: todos.filter(t=>t.priority==='high'&&!t.done).length,
  });

  // ── WebMCP tools ────────────────────────────────────────────────────────
  onMount(() => {
    const mc = (navigator as unknown as Record<string,unknown>).modelContext as {
      registerTool:(t:unknown)=>void; unregisterTool:(n:string)=>void;
    }|undefined;
    if (!mc) return;

    mc.registerTool({ name:'add_todo', description:'Add a new todo item.',
      inputSchema:{type:'object',properties:{text:{type:'string'},priority:{type:'string',enum:['low','normal','high']},tags:{type:'array',items:{type:'string'}}},required:['text']},
      execute:(args:Record<string,unknown>)=>jsonResult(addTodo(args.text as string, (args.priority as Todo['priority'])||'normal', (args.tags as string[])||[])),
    });
    mc.registerTool({ name:'list_todos', description:'List todos, optionally filtered.',
      inputSchema:{type:'object',properties:{filter:{type:'string',enum:['all','active','done']}}},
      execute:(args:Record<string,unknown>)=>jsonResult(todos.filter(t=>{const f=(args.filter||'all')as string;return f==='all'||f==='active'?!t.done:t.done;})),
      annotations:{readOnlyHint:true},
    });
    mc.registerTool({ name:'get_todo', description:'Get a specific todo by ID.',
      inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']},
      execute:(args:Record<string,unknown>)=>jsonResult(todos.find(t=>t.id===args.id as string)||null),
      annotations:{readOnlyHint:true},
    });
    mc.registerTool({ name:'toggle_todo', description:'Toggle a todo done/active.',
      inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']},
      execute:(args:Record<string,unknown>)=>jsonResult(toggleTodo(args.id as string)),
    });
    mc.registerTool({ name:'update_todo', description:'Update a todo text, priority or tags.',
      inputSchema:{type:'object',properties:{id:{type:'string'},text:{type:'string'},priority:{type:'string',enum:['low','normal','high']},tags:{type:'array',items:{type:'string'}}},required:['id']},
      execute:(args:Record<string,unknown>)=>{
          const patch: Partial<Omit<Todo,'id'|'createdAt'>> = {};
          if (args.text) patch.text = args.text as string;
          if (args.priority) patch.priority = args.priority as Todo['priority'];
          if (args.tags) patch.tags = args.tags as string[];
          return jsonResult(updateTodo(args.id as string, patch));
        },
    });
    mc.registerTool({ name:'delete_todo', description:'Delete a todo by ID.',
      inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']},
      execute:(args:Record<string,unknown>)=>jsonResult({deleted:deleteTodo(args.id as string)}),
      annotations:{destructiveHint:true},
    });
    mc.registerTool({ name:'clear_done_todos', description:'Remove all completed todos.',
      inputSchema:{type:'object',properties:{}},
      execute:()=>jsonResult({removed:clearDone()}),
      annotations:{destructiveHint:true},
    });
    mc.registerTool({ name:'get_todo_stats', description:'Get todo statistics.',
      inputSchema:{type:'object',properties:{}},
      execute:()=>jsonResult(stats),
      annotations:{readOnlyHint:true},
    });

    return () => {
      ['add_todo','list_todos','get_todo','toggle_todo','update_todo','delete_todo','clear_done_todos','get_todo_stats']
        .forEach(n => { try { mc.unregisterTool(n); } catch {} });
    };
  });
</script>

<svelte:head><title>Todo — WebMCP Demo</title></svelte:head>

<div class="min-h-screen bg-bg font-sans">
  <header class="border-b border-border bg-surface px-6 py-3 flex items-center gap-3">
    <div class="font-mono text-sm font-bold"><span class="text-white">Todo</span><span class="text-teal"> WebMCP</span></div>
    <div class="text-[10px] font-mono text-zinc-600">— 8 tools exposés à l'extension Chrome</div>
    <div class="flex-1"></div>
    <div class="text-[10px] font-mono text-teal flex items-center gap-1">
      <div class="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></div>
      navigator.modelContext
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-3">
      <StatCard spec={{ label: 'Total', value: String(stats.total), variant: 'default' }} />
      <StatCard spec={{ label: 'Actifs', value: String(stats.active), variant: 'info' }} />
      <StatCard spec={{ label: 'Terminés', value: String(stats.done), variant: 'success' }} />
      <StatCard spec={{ label: 'Urgents', value: String(stats.high), variant: 'error' }} />
    </div>

    <!-- Add form -->
    <div class="flex gap-2">
      <input class="flex-1 font-mono text-sm bg-surface border border-border2 rounded-lg px-4 py-2.5 text-zinc-300 outline-none focus:border-accent transition-colors placeholder-zinc-700"
        placeholder="Nouvelle tâche…" bind:value={input} onkeydown={(e)=>{if(e.key==='Enter'&&input.trim()){addTodo(input.trim(),newPriority);input='';}}} />
      <select class="font-mono text-xs bg-surface border border-border2 rounded-lg px-3 text-zinc-400 outline-none cursor-pointer"
        bind:value={newPriority}>
        <option value="low">low</option>
        <option value="normal">normal</option>
        <option value="high">high</option>
      </select>
      <button class="font-mono text-xs px-4 py-2.5 rounded-lg bg-accent text-white border border-accent hover:opacity-85 flex items-center gap-1.5"
        onclick={()=>{if(input.trim()){addTodo(input.trim(),newPriority);input='';}}} >
        <Plus size={13} /> Ajouter
      </button>
    </div>

    <!-- Filter -->
    <div class="flex gap-1">
      {#each [['all','Tous'],['active','Actifs'],['done','Terminés']] as [f, label]}
        <button class="font-mono text-xs px-3 py-1 rounded border transition-all
            {filter===f ? 'border-accent bg-accent/10 text-accent' : 'border-border2 text-zinc-500 hover:text-zinc-300'}"
          onclick={()=>filter=f as 'all'|'active'|'done'}>{label}</button>
      {/each}
      {#if todos.some(t=>t.done)}
        <button class="font-mono text-xs px-3 py-1 rounded border border-red-900 text-red-500 hover:bg-red-500/10 transition-all ml-auto"
          onclick={clearDone}>Effacer terminés</button>
      {/if}
    </div>

    <!-- Todos list -->
    <div class="flex flex-col gap-1.5">
      {#each filtered as todo (todo.id)}
        <div class="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-lg group hover:border-border2 transition-all">
          <button onclick={()=>toggleTodo(todo.id)} class="flex-shrink-0">
            {#if todo.done}
              <Check size={16} class="text-teal" />
            {:else}
              <Circle size={16} class="text-zinc-600 group-hover:text-zinc-400" />
            {/if}
          </button>
          <div class="w-1.5 h-1.5 rounded-full flex-shrink-0 {PRIORITY_DOT[todo.priority]}"></div>
          <span class="flex-1 text-sm {todo.done ? 'line-through text-zinc-600' : 'text-zinc-200'}">{todo.text}</span>
          {#each todo.tags as tag}
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-500">{tag}</span>
          {/each}
          <button class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
            onclick={()=>deleteTodo(todo.id)}>
            <Trash2 size={13} />
          </button>
        </div>
      {/each}
      {#if filtered.length === 0}
        <div class="text-center py-10 text-zinc-700 font-mono text-sm">
          {filter === 'done' ? 'Aucune tâche terminée.' : filter === 'active' ? 'Aucune tâche active.' : 'Aucune tâche.'}
        </div>
      {/if}
    </div>

    <!-- WebMCP tools list -->
    <div class="border border-border rounded-xl p-4">
      <div class="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">Tools WebMCP exposés</div>
      <DataTable spec={{ compact: true, rows: [
        { tool: 'add_todo', type: 'mut', description: 'Ajoute une tâche' },
        { tool: 'list_todos', type: 'ro', description: 'Liste les tâches (filter?)' },
        { tool: 'get_todo', type: 'ro', description: 'Détail par ID' },
        { tool: 'toggle_todo', type: 'mut', description: 'Inverse le statut done' },
        { tool: 'update_todo', type: 'mut', description: 'Modifie texte, priorité, tags' },
        { tool: 'delete_todo', type: 'del', description: 'Supprime une tâche' },
        { tool: 'clear_done_todos', type: 'del', description: 'Vide les terminées' },
        { tool: 'get_todo_stats', type: 'ro', description: 'Statistiques' },
      ], columns: [
        { key: 'tool', label: 'Tool' },
        { key: 'type', label: 'Type' },
        { key: 'description', label: 'Description' },
      ]}} />
    </div>
  </main>
</div>
