<script lang="ts">
  import { onMount } from 'svelte';
  import { jsonResult } from '@webmcp-auto-ui/core';
  import { Button, Input, Badge, NativeSelect, StatCard } from '@webmcp-auto-ui/ui';
  import { Check, Trash2, Plus, Circle } from 'lucide-svelte';

  // ── Types ───────────────────────────────────────────────────────────────
  interface Todo {
    id: string;
    text: string;
    done: boolean;
    priority: 'low' | 'normal' | 'high';
    createdAt: number;
  }

  // ── State ───────────────────────────────────────────────────────────────
  let todos = $state<Todo[]>([
    { id: '1', text: 'Activer WebMCP dans chrome://flags', done: false, priority: 'high', createdAt: Date.now() - 3600000 },
    { id: '2', text: 'Tester les outils dans l\'extension', done: false, priority: 'normal', createdAt: Date.now() - 1800000 },
    { id: '3', text: 'Lire la doc WebMCP W3C', done: true, priority: 'low', createdAt: Date.now() - 7200000 },
  ]);
  let input = $state('');
  let filter = $state<'all' | 'active' | 'done'>('all');
  let newPriority = $state<'low' | 'normal' | 'high'>('normal');

  // ── Helpers ─────────────────────────────────────────────────────────────
  const uid = () => crypto.randomUUID().slice(0, 8);

  function addTodo(text: string, priority: Todo['priority'] = 'normal') {
    const t: Todo = { id: uid(), text, done: false, priority, createdAt: Date.now() };
    todos = [...todos, t];
    return t;
  }
  function toggleTodo(id: string) {
    todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    return todos.find(t => t.id === id) ?? null;
  }
  function deleteTodo(id: string) {
    const had = todos.some(t => t.id === id);
    todos = todos.filter(t => t.id !== id);
    return had;
  }
  function clearDone() {
    const n = todos.filter(t => t.done).length;
    todos = todos.filter(t => !t.done);
    return n;
  }

  // ── Derived ─────────────────────────────────────────────────────────────
  const PRIORITY_DOT: Record<string, string> = { high: 'bg-red-400', normal: 'bg-zinc-400', low: 'bg-zinc-600' };

  const filtered = $derived(
    todos.filter(t => filter === 'all' ? true : filter === 'active' ? !t.done : t.done)
  );
  const stats = $derived({
    total: todos.length,
    active: todos.filter(t => !t.done).length,
    done: todos.filter(t => t.done).length,
    high: todos.filter(t => t.priority === 'high' && !t.done).length,
  });

  // ── Submit ──────────────────────────────────────────────────────────────
  function submit() {
    if (!input.trim()) return;
    addTodo(input.trim(), newPriority);
    input = '';
  }

  // ── WebMCP tools ────────────────────────────────────────────────────────
  onMount(() => {
    const mc = (navigator as unknown as Record<string, unknown>).modelContext as {
      registerTool: (t: unknown) => void;
      unregisterTool: (n: string) => void;
    } | undefined;
    if (!mc) return;

    mc.registerTool({ name: 'add_todo', description: 'Add a new todo item.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, priority: { type: 'string', enum: ['low', 'normal', 'high'] } }, required: ['text'] },
      execute: (a: Record<string, unknown>) => jsonResult(addTodo(a.text as string, (a.priority as Todo['priority']) || 'normal')),
    });
    mc.registerTool({ name: 'list_todos', description: 'List todos, optionally filtered.',
      inputSchema: { type: 'object', properties: { filter: { type: 'string', enum: ['all', 'active', 'done'] } } },
      execute: (a: Record<string, unknown>) => {
        const f = (a.filter || 'all') as string;
        return jsonResult(todos.filter(t => f === 'all' || (f === 'active' ? !t.done : t.done)));
      },
      annotations: { readOnlyHint: true },
    });
    mc.registerTool({ name: 'toggle_todo', description: 'Toggle a todo done/active.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      execute: (a: Record<string, unknown>) => jsonResult(toggleTodo(a.id as string)),
    });
    mc.registerTool({ name: 'delete_todo', description: 'Delete a todo by ID.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      execute: (a: Record<string, unknown>) => jsonResult({ deleted: deleteTodo(a.id as string) }),
      annotations: { destructiveHint: true },
    });
    mc.registerTool({ name: 'clear_done', description: 'Remove all completed todos.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult({ removed: clearDone() }),
      annotations: { destructiveHint: true },
    });
    mc.registerTool({ name: 'get_stats', description: 'Get todo statistics.',
      inputSchema: { type: 'object', properties: {} },
      execute: () => jsonResult(stats),
      annotations: { readOnlyHint: true },
    });

    return () => {
      ['add_todo', 'list_todos', 'toggle_todo', 'delete_todo', 'clear_done', 'get_stats']
        .forEach(n => { try { mc.unregisterTool(n); } catch {} });
    };
  });
</script>

<svelte:head><title>Todo WebMCP</title></svelte:head>

<div class="min-h-screen bg-bg font-sans">
  <!-- Header -->
  <header class="border-b border-border bg-surface px-6 py-3 flex items-center gap-3">
    <div class="font-mono text-sm font-bold">
      <span class="text-text1">Todo2</span><span class="text-teal"> WebMCP</span>
    </div>
    <span class="text-[10px] font-mono text-text2">Todo WebMCP</span>
    <div class="flex-1"></div>
    <div class="text-[10px] font-mono text-teal flex items-center gap-1">
      <div class="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"></div>
      6 tools
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
    <!-- Stats -->
    <div class="grid grid-cols-4 gap-3">
      <StatCard spec={{ label: 'Total', value: String(stats.total), variant: 'default' }} />
      <StatCard spec={{ label: 'Actifs', value: String(stats.active), variant: 'info' }} />
      <StatCard spec={{ label: 'Faits', value: String(stats.done), variant: 'success' }} />
      <StatCard spec={{ label: 'Urgents', value: String(stats.high), variant: 'error' }} />
    </div>

    <!-- Add form -->
    <div class="flex gap-2">
      <Input class="flex-1 font-mono text-sm" placeholder="Nouvelle tache..."
        bind:value={input} onkeydown={(e) => { if (e.key === 'Enter') submit(); }} />
      <NativeSelect bind:value={newPriority} class="font-mono text-xs w-24">
        <option value="low">low</option>
        <option value="normal">normal</option>
        <option value="high">high</option>
      </NativeSelect>
      <Button class="flex items-center gap-1.5" onclick={submit}>
        <Plus size={13} /> Ajouter
      </Button>
    </div>

    <!-- Filter -->
    <div class="flex gap-1">
      {#each [['all', 'Tous'], ['active', 'Actifs'], ['done', 'Faits']] as [f, label]}
        <Button variant="outline" size="sm"
          class="font-mono text-xs {filter === f ? 'border-accent bg-accent/10 text-accent' : ''}"
          onclick={() => filter = f as 'all' | 'active' | 'done'}>{label}</Button>
      {/each}
      {#if todos.some(t => t.done)}
        <Button variant="destructive" size="sm" class="ml-auto font-mono text-xs"
          onclick={clearDone}>Effacer faits</Button>
      {/if}
    </div>

    <!-- Todo list -->
    <div class="flex flex-col gap-1.5">
      {#each filtered as todo (todo.id)}
        <div class="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-lg group hover:border-border2 transition-all">
          <Button variant="ghost" size="icon" class="h-6 w-6 flex-shrink-0" onclick={() => toggleTodo(todo.id)}>
            {#if todo.done}
              <Check size={16} class="text-teal" />
            {:else}
              <Circle size={16} class="text-text2" />
            {/if}
          </Button>
          <div class="w-1.5 h-1.5 rounded-full flex-shrink-0 {PRIORITY_DOT[todo.priority]}"></div>
          <span class="flex-1 text-sm {todo.done ? 'line-through text-text2' : 'text-text1'}">{todo.text}</span>
          <Badge variant="secondary" class="text-[10px] font-mono px-1.5 py-0.5">{todo.priority}</Badge>
          <Button variant="ghost" size="icon"
            class="h-6 w-6 opacity-0 group-hover:opacity-100 text-text2 hover:text-red-400"
            onclick={() => deleteTodo(todo.id)}>
            <Trash2 size={13} />
          </Button>
        </div>
      {/each}
      {#if filtered.length === 0}
        <div class="text-center py-10 text-text2 font-mono text-sm">
          {filter === 'done' ? 'Aucune tache faite.' : filter === 'active' ? 'Tout est fait !' : 'Liste vide.'}
        </div>
      {/if}
    </div>
  </main>
</div>
