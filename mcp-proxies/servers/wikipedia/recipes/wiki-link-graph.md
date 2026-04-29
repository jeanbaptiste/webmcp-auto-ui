---
id: wiki-link-graph
name: Wikipedia link graph
description: Liens sortants d'un article structurés en table, stats de réseau, et cartes des liens vedettes.
when: the user asks which articles are cited by a page, the outgoing links, or wants a knowledge-network view
servers: [wikipedia]
tools_used: [get_links, get_summary]
data_type: list
components_used: [table, stat-card, cards]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards row, top links cards on the left, full table on the right
---

## When to use

The user wants the network of references from one article:
- "Quels articles cite la page Mécanique quantique ?"
- "Liens sortants de l'article Histoire de France"
- "What does the article on Photosynthesis link to?"
- "Show me the link graph of the Internet article"

## How to use

1. **Fetch the links list**:
   ```js
   const res = await call('get_links', { title: 'Quantum mechanics' });
   const links = res.links;
   ```

2. **Compute basic stats**:
   ```js
   const total = links.length;
   const sample = links.slice(0, 12);
   ```

3. **Optionally enrich top 6 with summaries** (cards body):
   ```js
   const summaries = await Promise.all(
     sample.slice(0, 6).map(l => call('get_summary', { title: l }).catch(() => ({ title: l, summary: '' })))
   );
   ```

4. **Render stat-cards + cards + table**:
   ```js
   await widget('stat-card', { label: 'Outgoing links', value: total, icon: 'link' });
   await widget('stat-card', { label: 'Sampled', value: sample.length, icon: 'eye' });
   await widget('cards', {
     items: summaries.map(s => ({
       title: s.title,
       body: (s.summary || '').slice(0, 140),
       url: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, '_'))}`
     }))
   });
   await widget('table', {
     columns: ['#', 'Linked article'],
     rows: links.map((l, i) => [i + 1, l])
   });
   ```

## Examples

### Mécanique quantique
```js
const res = await call('get_links', { title: 'Quantum mechanics' });
const top = res.links.slice(0, 6);
const sums = await Promise.all(top.map(l => call('get_summary', { title: l }).catch(() => null)));
await widget('stat-card', { label: 'Links', value: res.links.length, icon: 'link' });
await widget('cards', {
  items: sums.filter(Boolean).map(s => ({ title: s.title, body: s.summary.slice(0, 120) }))
});
await widget('table', { columns: ['#', 'Article'], rows: res.links.map((l, i) => [i + 1, l]) });
```

### Internet outgoing links
```js
const res = await call('get_links', { title: 'Internet' });
await widget('stat-card', { label: 'Outgoing', value: res.links.length, icon: 'link' });
await widget('table', { columns: ['#', 'Linked article'], rows: res.links.slice(0, 100).map((l, i) => [i + 1, l]) });
```

## Common mistakes

- **Rendering 1000+ rows in the table**: large articles have huge link lists — cap at 100-200 rows
- **Calling `get_summary` for every link**: 200 sequential calls is slow ; sample 6-10 for cards only
- **Treating `links` as objects**: it's an array of strings (titles)
- **Not catching errors on `get_summary`**: a stale or redirect link may 404 — wrap with `.catch`
- **Forgetting the count stat-card**: the total is the headline metric — show it before the table
- **Using `Promise.all` on 50 summaries** without `catch`: one failure kills the whole batch
