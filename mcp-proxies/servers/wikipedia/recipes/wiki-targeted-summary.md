---
id: wiki-targeted-summary
name: Wikipedia targeted summary
description: Résumé d'article ciblé sur une sous-question précise, avec contexte de l'article-source.
when: the user asks a specific sub-question about an article, or wants a focused excerpt rather than the full intro
servers: [wikipedia]
tools_used: [summarize_article_for_query, get_summary]
data_type: text
components_used: [text, kv]
layout:
  type: grid
  columns: 1
  arrangement: short context kv on top, focused summary text below
---

## When to use

The user has a precise sub-question rather than a general lookup:
- "Que dit Wikipédia sur l'algorithme de Shor dans l'article Calcul quantique ?"
- "What does the Photosynthesis article say about the Calvin cycle?"
- "Dans l'article Système solaire, qu'est-ce qui concerne la ceinture de Kuiper ?"

`summarize_article_for_query` extracts a contextual snippet around the query terms instead of returning the full intro.

## How to use

1. **Run the targeted summary**:
   ```js
   const res = await call('summarize_article_for_query', {
     title: 'Quantum computing',
     query: "Shor's algorithm",
     max_length: 300
   }).catch(() => null);
   ```

2. **Fetch the article's general summary for context** (so the user sees where the snippet comes from):
   ```js
   const ctx = await call('get_summary', { title: 'Quantum computing' }).catch(() => null);
   ```

3. **Render context + focused answer**:
   ```js
   await widget('kv', {
     items: [
       { label: 'Article', value: res?.title ?? '—' },
       { label: 'Query', value: res?.query ?? '—' }
     ]
   });
   await widget('text', { content: res?.summary ?? '(no targeted summary)' });
   await widget('text', { content: `Article context: ${(ctx?.summary ?? '').slice(0, 240)}…` });
   ```

## Examples

### Shor's algorithm inside Quantum computing
```js
const res = await call('summarize_article_for_query', {
  title: 'Quantum computing',
  query: "Shor's algorithm",
  max_length: 280
}).catch(() => null);
await widget('kv', { items: [{ label: 'Article', value: res?.title ?? '—' }, { label: 'Query', value: res?.query ?? '—' }] });
await widget('text', { content: res?.summary ?? '(no targeted summary)' });
```

### Calvin cycle inside Photosynthesis
```js
const [res, ctx] = await Promise.all([
  call('summarize_article_for_query', { title: 'Photosynthesis', query: 'Calvin cycle', max_length: 250 }).catch(() => null),
  call('get_summary', { title: 'Photosynthesis' }).catch(() => null)
]);
await widget('kv', { items: [{ label: 'Article', value: res?.title ?? '—' }, { label: 'Query', value: res?.query ?? '—' }] });
await widget('text', { content: res?.summary ?? '(no targeted summary)' });
await widget('text', { content: ctx?.summary ?? '' });
```

## Common mistakes

- **Setting `max_length` too low (<100)**: the snippet gets truncated mid-sentence — keep ≥200 for readability
- **Passing the user's full sentence as `query`**: keep keywords only — the tool does keyword scoring, not semantic search
- **Calling `get_article` then filtering client-side**: that defeats the tool's purpose ; the server already does the extraction
- **Forgetting to show the article title in `kv`**: without it the user loses the source of the snippet
- **Reusing `summarize_article_for_query` for full overviews**: use `get_summary` instead for general intro
- **Ignoring empty result**: if the query terms don't appear, the summary may be the article intro — flag this in `kv`
