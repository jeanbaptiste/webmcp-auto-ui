---
id: wiki-article-overview
name: Wikipedia article overview
description: Fiche encyclopédique structurée — profil, intro, sommaire et métadonnées d'un article Wikipedia.
when: the user asks for a complete article overview, an encyclopedic factsheet, or a 360° view on a topic
servers: [wikipedia]
tools_used: [get_summary, get_article, get_sections]
data_type: article
components_used: [profile, text, kv, table]
---

## When to use

The user wants a complete encyclopedic factsheet:
- "Donne-moi une fiche complète sur Marie Curie"
- "Présente-moi le Mont Fuji"
- "Fiche complète sur Alan Turing"
- "Tell me everything about the Eiffel Tower"

This recipe combines short summary, full article context, structured sections list, and metadata to give a 360° view at a glance.

## How to use

1. **Fetch the short summary** (intro paragraph):
   ```js
   const sum = await call('get_summary', { title: 'Alan Turing' }).catch(() => null);
   ```

2. **Fetch the full article** (used for metadata + URL + categories):
   ```js
   const art = await call('get_article', { title: 'Alan Turing' }).catch(() => null);
   if (!art || art?.exists === false) return widget('text', { content: 'Page not found.' });
   ```

3. **Fetch the sections list** (table of contents):
   ```js
   const secs = await call('get_sections', { title: 'Alan Turing' }).catch(() => null);
   ```

4. **Render the profile + summary**:
   ```js
   await widget('profile', {
     name: art?.title ?? '—',
     subtitle: (art?.categories ?? []).slice(0, 2).join(' · '),
     url: art?.url
   });
   await widget('text', { content: sum?.summary ?? '(no summary available)' });
   ```

5. **Metadata as kv + sections as table**:
   ```js
   await widget('kv', {
     items: [
       { label: 'Page ID', value: String(art?.pageid ?? '—') },
       { label: 'Categories', value: (art?.categories ?? []).length },
       { label: 'Outgoing links', value: (art?.links ?? []).length },
       { label: 'URL', value: art?.url ?? '—' }
     ]
   });
   await widget('data-table', {
     columns: ['Section', 'Level'],
     rows: (secs?.sections ?? []).map(s => [s?.title ?? '—', s?.level ?? '—'])
   });
   ```

## Examples

### Marie Curie factsheet
```js
const [sum, art, secs] = await Promise.all([
  call('get_summary', { title: 'Marie Curie' }).catch(() => null),
  call('get_article', { title: 'Marie Curie' }).catch(() => null),
  call('get_sections', { title: 'Marie Curie' }).catch(() => null)
]);
if (!art || art?.exists === false) return widget('text', { content: 'Page not found.' });

await widget('profile', { name: art?.title ?? '—', subtitle: 'Physicist · Chemist', url: art?.url });
await widget('text', { content: sum?.summary ?? '(no summary)' });
await widget('kv', {
  items: [
    { label: 'Categories', value: (art?.categories ?? []).length },
    { label: 'Sections', value: (secs?.sections ?? []).length }
  ]
});
await widget('data-table', {
  columns: ['Section', 'Level'],
  rows: (secs?.sections ?? []).map(s => [s?.title ?? '—', s?.level ?? '—'])
});
```

### Mont Fuji factsheet
```js
const sum = await call('get_summary', { title: 'Mount Fuji' }).catch(() => null);
const art = await call('get_article', { title: 'Mount Fuji' }).catch(() => null);
if (!art || art?.exists === false) return widget('text', { content: 'Page not found.' });
await widget('profile', { name: art?.title ?? '—', url: art?.url });
await widget('text', { content: sum?.summary ?? '(no summary)' });
```

## Common mistakes

- **Calling `get_article` for a short summary**: prefer `get_summary` first — `get_article` returns 50+ KB of text and slow on large pages
- **Hardcoding section levels**: levels can be 1-6 ; render them as-is rather than assuming a max depth
- **Ignoring `art.exists === false`**: the page may not exist for the configured language — check before rendering
- **Concatenating all sections into the text widget**: the `text` widget is for the intro/summary only ; sections belong in the table
- **Forgetting to coerce `pageid` to string** in `kv`: numeric ids may render oddly in some kv variants
- **Calling all 3 tools sequentially**: use `Promise.all` to parallelize — the 3 endpoints are independent
