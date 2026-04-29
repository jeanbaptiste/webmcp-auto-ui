---
id: wiki-quick-summary
name: Wikipedia quick summary
description: Réponse express — résumé court + 3 faits clés. Le scénario "définition rapide" du quotidien.
when: the user asks "what is X", "résume X en 3 lignes", or wants a quick definition of a concept
servers: [wikipedia]
tools_used: [get_summary, extract_key_facts]
data_type: text
components_used: [text, kv]
layout:
  type: grid
  columns: 1
  arrangement: short summary text on top, 3 facts as kv below
---

## When to use

The most common encyclopedic scenario — a quick lookup:
- "Résume Photosynthèse en 3 lignes"
- "C'est quoi la mitose ?"
- "Quick definition of relativity"
- "Explique-moi la blockchain"

## How to use

1. **Fetch summary + 3 facts in parallel**:
   ```js
   const [sum, facts] = await Promise.all([
     call('get_summary', { title: 'Photosynthesis' }).catch(() => null),
     call('extract_key_facts', { title: 'Photosynthesis', count: 3 }).catch(() => null)
   ]);
   ```

2. **Render**:
   ```js
   await widget('text', { content: sum?.summary ?? 'No summary available' });
   await widget('kv', {
     items: (facts?.facts ?? []).map((f, i) => ({ label: `Fact ${i + 1}`, value: f }))
   });
   ```

## Examples

### Photosynthesis
```js
const [sum, facts] = await Promise.all([
  call('get_summary', { title: 'Photosynthesis' }).catch(() => null),
  call('extract_key_facts', { title: 'Photosynthesis', count: 3 }).catch(() => null)
]);
await widget('text', { content: sum?.summary ?? 'No summary available' });
await widget('kv', { items: (facts?.facts ?? []).map((f, i) => ({ label: `Fact ${i + 1}`, value: f })) });
```

### Mitose
```js
const sum = await call('get_summary', { title: 'Mitosis' }).catch(() => null);
const facts = await call('extract_key_facts', { title: 'Mitosis', count: 3 }).catch(() => null);
await widget('text', { content: sum?.summary ?? 'No summary available' });
await widget('kv', { items: (facts?.facts ?? []).map((f, i) => ({ label: `Fait ${i + 1}`, value: f })) });
```

### Blockchain definition
```js
const sum = await call('get_summary', { title: 'Blockchain' }).catch(() => null);
await widget('text', { content: sum?.summary ?? 'No summary available' });
```

## Common mistakes

- **Asking `count: 10` for a "quick" summary**: 3 is the sweet spot — past 5 it stops being "quick"
- **Calling `get_article` instead of `get_summary`**: returns 50+ KB for nothing — `get_summary` is enough
- **Rendering facts inside the text widget**: kv makes them scannable ; text hides them in prose
- **Disambiguation traps**: "Mercury" → planet vs element vs Freddie ; pick the canonical title or run `search_wikipedia` first
- **Ignoring null returns**: missing pages return summary `null` — guard with `?? 'No summary available'`
- **Sequential calls**: parallelize summary + facts with `Promise.all`
