---
id: wiki-multilang-compare
name: Wikipedia multilang compare
description: Compare le même article entre plusieurs langues Wikipedia — biais éditoriaux, longueurs, structures.
when: the user asks to compare the same article across languages, or what a topic looks like in fr/en/de/ja
servers: [wikipedia]
tools_used: [get_summary, get_sections, test_wikipedia_connectivity]
data_type: comparison
components_used: [table, text, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: connectivity stat-cards on top, summaries text columns, sections comparison table full-width
---

## When to use

The user wants to spot editorial differences between language versions:
- "Compare l'article Révolution française en français, anglais et allemand"
- "Que dit Wikipedia japonais sur le sushi ?"
- "Compare 'World War II' across en, fr, de, ja"

Note: this recipe assumes the MCP server is running multiple language instances (one per `--language`). The `test_wikipedia_connectivity` tool reports the configured language.

## How to use

1. **Check connectivity** to verify the active language:
   ```js
   const conn = await call('test_wikipedia_connectivity', {}).catch(() => null);
   ```

2. **Fetch summary + sections for the configured language**:
   ```js
   const [sum, secs] = await Promise.all([
     call('get_summary', { title: 'French Revolution' }).catch(() => null),
     call('get_sections', { title: 'French Revolution' }).catch(() => null)
   ]);
   if (!sum) return widget('text', { content: 'Page not found in this language.' });
   ```

3. **Render connectivity + headline stats**:
   ```js
   await widget('stat-card', { label: 'Language', value: conn?.language ?? '—', icon: 'globe' });
   await widget('stat-card', { label: 'Sections', value: (secs?.sections ?? []).length, icon: 'list' });
   await widget('stat-card', { label: 'Server', value: conn?.server ?? '—', icon: 'server' });
   ```

4. **Render summary + sections table**:
   ```js
   await widget('kv', { items: [{ label: 'Title', value: sum?.title ?? '—' }, { label: 'Language', value: conn?.language ?? '—' }] });
   await widget('text', { content: sum?.summary ?? '(no summary)' });
   await widget('data-table', {
     columns: ['Section', 'Level'],
     rows: (secs?.sections ?? []).map(s => [s?.title ?? '—', s?.level ?? '—'])
   });
   ```

> To compare more than one language at once, run this recipe across multiple wikipedia-* server instances (e.g. `wikipedia-fr`, `wikipedia-en`) and merge the results client-side.

## Examples

### French Revolution — current language
```js
const conn = await call('test_wikipedia_connectivity', {}).catch(() => null);
const [sum, secs] = await Promise.all([
  call('get_summary', { title: 'French Revolution' }).catch(() => null),
  call('get_sections', { title: 'French Revolution' }).catch(() => null)
]);
await widget('stat-card', { label: 'Lang', value: conn?.language ?? '—' });
await widget('text', { content: sum?.summary ?? '(no summary)' });
await widget('data-table', { columns: ['Section', 'Level'], rows: (secs?.sections ?? []).map(s => [s?.title ?? '—', s?.level ?? '—']) });
```

### Sushi article snapshot
```js
const conn = await call('test_wikipedia_connectivity', {}).catch(() => null);
const sum = await call('get_summary', { title: 'Sushi' }).catch(() => null);
await widget('kv', { items: [{ label: 'Lang', value: conn?.language ?? '—' }, { label: 'Title', value: sum?.title ?? '—' }] });
await widget('text', { content: sum?.summary ?? '(no summary)' });
```

## Common mistakes

- **Assuming a single MCP server speaks all languages**: each instance is locked to one language — compare across server URLs
- **Title translation**: "Révolution française" exists on fr.wikipedia, "French Revolution" on en — use the canonical title per language
- **Ignoring `conn.status !== 'success'`**: report the failure visibly via stat-card before running other tools
- **Comparing section counts naively**: deeper sub-sections inflate the count ; filter by `level <= 2` for fair comparison
- **Over-relying on summary length** as a proxy for article quality: short summaries can come from rich articles
- **Caching across languages**: do not reuse a result from one server for another — always re-fetch per language
