---
id: wiki-search-results
name: Wikipedia search results
description: Liste de résultats de recherche Wikipedia en cartes cliquables avec stats de synthèse.
when: the user asks to search Wikipedia, find articles on a topic, or disambiguate between several pages
servers: [wikipedia]
tools_used: [search_wikipedia]
data_type: list
components_used: [cards, stat-card]
layout:
  type: grid
  columns: 3
  arrangement: stat-cards row at top, results cards in a 3-col grid below
---

## When to use

The user runs an open search on Wikipedia:
- "Cherche des articles sur la blockchain"
- "Que trouves-tu sur l'expressionnisme allemand ?"
- "Search Wikipedia for 'quantum entanglement'"
- "Articles about climate change"

`search_wikipedia` returns a ranked list with snippet, wordcount, pageid and timestamp — ideal for disambiguation and exploration.

## How to use

1. **Run the search** (default 10, max ~50 useful):
   ```js
   const res = await call('search_wikipedia', { query: 'blockchain', limit: 10 }).catch(() => null);
   const hits = (res?.results ?? []).filter(h => h);
   if (hits.length === 0) {
     await widget('stat-card', { label: 'Results', value: 0, icon: 'search' });
     return widget('text', { content: 'No matching articles.' });
   }
   ```

2. **Compute aggregate stats**:
   ```js
   const total = hits.length;
   const wordCounts = hits.map(h => h?.wordcount || 0).filter(Number.isFinite);
   const avgWords = Math.round(wordCounts.reduce((s, w) => s + w, 0) / Math.max(1, wordCounts.length));
   const longest = wordCounts.length > 0 ? Math.max(...wordCounts) : 0;
   ```

3. **Render stat-cards**:
   ```js
   await widget('stat-card', { label: 'Results', value: total, icon: 'search' });
   await widget('stat-card', { label: 'Avg words', value: avgWords, icon: 'file-text' });
   await widget('stat-card', { label: 'Longest', value: longest, icon: 'maximize' });
   ```

4. **Render result cards** (clickable):
   ```js
   await widget('cards', {
     items: hits.map(h => ({
       title: h?.title ?? '—',
       subtitle: `${h?.wordcount ?? 0} words`,
       body: (h?.snippet ?? '').replace(/<[^>]+>/g, ''),
       url: `https://en.wikipedia.org/wiki/${encodeURIComponent((h?.title ?? '').replace(/ /g, '_'))}`
     }))
   });
   ```

## Examples

### Search "intelligence artificielle"
```js
const res = await call('search_wikipedia', { query: 'intelligence artificielle', limit: 12 }).catch(() => null);
const hits = (res?.results ?? []).filter(h => h);
await widget('stat-card', { label: 'Results', value: hits.length, icon: 'search' });
await widget('cards', {
  items: hits.map(h => ({
    title: h?.title ?? '—',
    subtitle: `${h?.wordcount ?? 0} words`,
    body: (h?.snippet ?? '').replace(/<[^>]+>/g, ''),
    url: `https://fr.wikipedia.org/wiki/${encodeURIComponent((h?.title ?? '').replace(/ /g, '_'))}`
  }))
});
```

### Quick disambiguation lookup
```js
const res = await call('search_wikipedia', { query: 'Mercury', limit: 8 }).catch(() => null);
const hits = (res?.results ?? []).filter(h => h);
await widget('cards', {
  items: hits.map(h => ({ title: h?.title ?? '—', body: (h?.snippet ?? '').replace(/<[^>]+>/g, '') }))
});
```

## Common mistakes

- **Leaving the `<span class="searchmatch">` HTML in `snippet`**: strip it with `.replace(/<[^>]+>/g, '')` before rendering
- **Using `limit > 50`**: Wikipedia's API caps useful relevance around 20-30 — large limits just pad with weak matches
- **Forgetting to URL-encode the title**: titles contain spaces and accents — use `encodeURIComponent` and replace spaces with `_`
- **Hardcoding `en.wikipedia.org`**: the server may be configured for fr/de/ja — match the language used by the server
- **Showing only `pageid`**: the user wants the readable title and snippet, not numeric ids
- **Not handling empty results**: render an explicit "no results" stat-card rather than an empty cards widget
