---
id: wiki-related-explorer
name: Wikipedia related explorer
description: Cartes de sujets connexes avec résumés courts — construit un parcours d'apprentissage.
when: the user asks for related topics, what to read next, or wants to explore around an article
servers: [wikipedia]
tools_used: [get_related_topics, get_summary]
data_type: graph
components_used: [cards, kv, text]
layout:
  type: grid
  columns: 3
  arrangement: source summary on top, related cards in 3-col grid below
---

## When to use

The user wants a learning path around a topic, not just one article:
- "Sujets liés à la cryptographie quantique"
- "Que dois-je lire après l'article Renaissance ?"
- "Articles related to Photosynthesis"
- "Where do I go next after reading Quantum mechanics?"

## How to use

1. **Get the source summary** (anchors the user):
   ```js
   const sum = await call('get_summary', { title: 'Quantum cryptography' }).catch(() => null);
   ```

2. **Fetch related topics**:
   ```js
   const rel = await call('get_related_topics', { title: 'Quantum cryptography', limit: 8 }).catch(() => null);
   const related = rel?.related_topics ?? [];
   ```

3. **Fetch short summaries for top 5** (to enrich the cards):
   ```js
   const top = related.slice(0, 5);
   const summaries = await Promise.all(top.map(t => {
     const title = typeof t === 'string' ? t : t?.title;
     return title ? call('get_summary', { title }).catch(() => null) : Promise.resolve(null);
   }));
   ```

4. **Render context + cards**:
   ```js
   await widget('kv', { rows: [['Source', String(sum?.title ?? '—')]] });
   await widget('text', { content: sum?.summary ?? '(no summary)' });
   await widget('cards', {
     items: summaries.filter(Boolean).map(s => ({
       title: s?.title ?? '—',
       body: (s?.summary ?? '').slice(0, 200) + '…',
       url: `https://en.wikipedia.org/wiki/${encodeURIComponent((s?.title ?? '').replace(/ /g, '_'))}`
     }))
   });
   ```

## Examples

### After "Renaissance"
```js
const rel = await call('get_related_topics', { title: 'Renaissance', limit: 10 }).catch(() => null);
const related = rel?.related_topics ?? [];
const top = related.slice(0, 6);
const sums = await Promise.all(top.map(t => {
  const title = typeof t === 'string' ? t : t?.title;
  return title ? call('get_summary', { title }).catch(() => null) : Promise.resolve(null);
}));
await widget('cards', {
  items: sums.filter(Boolean).map(s => ({ title: s?.title ?? '—', body: (s?.summary ?? '').slice(0, 180) }))
});
```

### Explore around Photosynthesis
```js
const [src, rel] = await Promise.all([
  call('get_summary', { title: 'Photosynthesis' }).catch(() => null),
  call('get_related_topics', { title: 'Photosynthesis', limit: 8 }).catch(() => null)
]);
await widget('text', { content: src?.summary ?? '(no summary)' });
const related = (rel?.related_topics ?? []).slice(0, 6);
await widget('cards', {
  items: related.map(t => ({ title: typeof t === 'string' ? t : (t?.title ?? '—') }))
});
```

## Common mistakes

- **Calling `get_summary` for all 10+ related items**: capped 5-6 — beyond that the latency dominates
- **Assuming `related_topics` is an array of strings**: it can be `[{title, ...}]` — handle both shapes
- **Truncating summaries to 50 chars**: cards become useless — keep ≥150
- **Skipping the source summary**: without context the user loses the anchor
- **Using the same `limit` for related and summaries**: ask for more related (8-10) but only summarize top 5
- **Sequential summary calls**: always use `Promise.all` — the calls are independent
