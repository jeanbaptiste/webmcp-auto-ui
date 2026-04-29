---
id: hn-trend-comparator
name: HackerNews trend comparator
description: Comparaison side-by-side de plusieurs mots-clés — volume, score moyen, top posts par terme.
when: the user asks to compare engagement between two or more terms or technologies on HackerNews
servers: [hackernews]
tools_used: [search-posts]
data_type: comparison
components_used: [stat-card, chart-rich, table]
layout:
  type: grid
  columns: 2
  arrangement: comparison stat-cards row, side-by-side bar charts, ranked table at the bottom
---

## When to use

The user wants to compare two or more topics across HN:
- "Compare 'AI' vs 'crypto' engagement on HackerNews"
- "Rust vs Go vs Zig on HN"
- "Is React or Vue more discussed on HN?"
- "Compare 'remote work' and 'return to office' posts"
- "PostgreSQL vs MySQL traction on HN"

The agent loops over each term, fetches its results, and composes a comparative view.

## How to use

1. **Define the terms to compare** and fetch each in turn:
   ```js
   const terms = ['AI', 'crypto', 'web3'];
   const buckets = {};
   for (const term of terms) {
     const res = await call('search-posts', {
       query: term,
       tags: ['story'],
       numericFilters: ['points>=100'],
       hitsPerPage: 100
     });
     buckets[term] = (res?.hits ?? []).filter(p => p);
   }
   ```

2. **Compute per-term KPIs**:
   ```js
   const summary = terms.map(t => {
     const posts = buckets[t] ?? [];
     const avgPoints = Math.round(posts.reduce((s, x) => s + (x?.points || 0), 0) / Math.max(posts.length, 1));
     const avgComments = Math.round(posts.reduce((s, x) => s + (x?.num_comments || 0), 0) / Math.max(posts.length, 1));
     return { term: t, count: posts.length, avgPoints, avgComments };
   });
   ```

3. **Stat-cards — one per term, headline metric**:
   ```js
   for (const s of summary) {
     await widget('stat-card', { label: s.term, value: `${s.count} posts`, icon: 'search' });
   }
   ```

4. **Volume comparison chart**:
   ```js
   await widget('chart-rich', {
     type: 'bar',
     title: 'Posts per term',
     data: summary.map(s => ({ label: s.term, value: s.count }))
   });
   ```

5. **Average score comparison**:
   ```js
   await widget('chart-rich', {
     type: 'bar',
     title: 'Average score per term',
     data: summary.map(s => ({ label: s.term, value: s.avgPoints }))
   });
   ```

6. **Ranked summary table**:
   ```js
   await widget('table', {
     columns: ['Term', 'Posts', 'Avg points', 'Avg comments'],
     rows: summary
       .sort((a, b) => b.count - a.count)
       .map(s => [s.term, s.count, s.avgPoints, s.avgComments])
   });
   ```

7. **Top post per term** (optional — quick qualitative anchor):
   ```js
   await widget('table', {
     columns: ['Term', 'Top post', 'Points'],
     rows: terms.map(t => {
       const arr = buckets[t] ?? [];
       const top = arr.length > 0 ? [...arr].sort((a, b) => (b?.points ?? 0) - (a?.points ?? 0))[0] : null;
       return [t, top?.title ?? '—', top?.points ?? 0];
     })
   });
   ```

## Examples

### AI vs crypto vs web3
```js
const terms = ['AI', 'crypto', 'web3'];
const buckets = {};
for (const t of terms) {
  const res = await call('search-posts', { query: t, tags: ['story'], numericFilters: ['points>=100'], hitsPerPage: 100 }).catch(() => null);
  buckets[t] = (res?.hits ?? []).filter(p => p);
}
await widget('chart-rich', {
  type: 'bar',
  title: 'High-score posts (100+)',
  data: terms.map(t => ({ label: t, value: (buckets[t] ?? []).length }))
});
```

### Rust vs Go vs Zig
```js
const terms = ['Rust', 'Golang', 'Zig'];
const summary = [];
for (const t of terms) {
  const res = await call('search-posts', { query: t, tags: ['story'], numericFilters: ['points>=50'], hitsPerPage: 50 }).catch(() => null);
  const hits = (res?.hits ?? []).filter(p => p);
  summary.push({ term: t, count: hits.length, avg: Math.round(hits.reduce((s, x) => s + (x?.points || 0), 0) / Math.max(hits.length, 1)) });
}
await widget('table', {
  columns: ['Language', 'Posts', 'Avg score'],
  rows: summary.map(s => [s.term, s.count, s.avg])
});
```

## Common mistakes

- **Sequential loops without await**: each `call('search-posts', ...)` must be awaited — `Promise.all` works but mind the rate limit
- **Asymmetric filters**: comparing two terms with different `numericFilters` invalidates the comparison — keep the threshold identical
- **Comparing 'AI' with 'A.I.'**: HN search is keyword-based, not semantic — pick one canonical spelling per term
- **Picking generic stop-words**: terms like 'the' or 'tech' return everything; prefer specific tokens
- **Forgetting that `hitsPerPage: 1000` may saturate**: HN Algolia caps real result counts; use `res.nbHits` (total available) for fair volume comparison
- **Reading `res.nbHits` only**: `nbHits` is the total in the index, but `hits` is the (paginated) sample; for fairness either compare `nbHits` (true volume) or sample size (engagement)
