---
id: met-thematic-journey
name: Cross-departmental thematic journey through the Met collection
description: Mosaic + per-culture cards + chart of departments + KV of shared tags for a transverse theme
when: the user asks for a theme that crosses departments (mythology, horses across cultures, women in portraits)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: thématique
components_used: [gallery, cards, chart, kv]
layout:
  type: grid
  columns: 2
  arrangement: full-width gallery at top, cards grouped by culture, chart + kv at the bottom
---

## When to use

- "Greek mythology across the Met"
- "Portraits of women in the collection"
- "Representations of the horse across cultures"
- "Floral motifs in the museum"

## How to use

1. **Search the theme** (Met API: `tags: true` filter currently returns 0 — use a plain `q` search):
   ```js
   const search = await call('search-museum-objects', {
     q: 'Athena mythology',
          hasImages: true,
     pageSize: 30
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No matches.' });
   ```

2. **Fetch a sample** (small batch — Met bridge throttles parallel requests):
   ```js
   const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = objs.filter(o => o?.object).map(o => o.object); // no image filter — downstream widgets need all works
   ```

3. **Mosaic gallery** (visual cross-section):
   ```js
   const worksWithImg = works.filter(w => w?.primaryImageSmall);
   const images = worksWithImg.length
     ? worksWithImg.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: `${w?.culture || w?.department || '—'} — ${w?.objectDate ?? '—'}` }))
     : [{ src: '', alt: 'No image available', caption: '—' }];
   await widget('gallery', { images });
   ```

4. **Cards grouped by culture**:
   ```js
   const byCulture = Object.entries(works.reduce((acc, w) => { const cult = w?.culture || w?.department || 'Unknown'; (acc[cult] = acc[cult] || []).push(w); return acc; }, {}));
   const items = byCulture.flatMap(([culture, ws]) => ws.slice(0, 2).map(w => ({ title: w?.title ?? '(untitled)', subtitle: culture, image: w?.primaryImageSmall, body: w?.objectDate ?? '—' })));
   await widget('cards', { items: items.length ? items : [{ title: 'No samples', subtitle: '—' }] });
   ```

5. **Chart of departments touched**:
   ```js
   const byDept = works.reduce((acc, w) => { const d = w?.department ?? '—'; acc[d] = (acc[d] || 0) + 1; return acc; }, {});
   const data = Object.entries(byDept).map(([k, v]) => ({ label: k, value: v }));
   await widget('chart', { type: 'bar', data: data.length ? data : [{ label: 'sample', value: works.length || 1 }] });
   ```

6. **KV of shared tags**:
   ```js
   const tagCount = {};
   for (const w of works) for (const t of (w?.tags ?? [])) { const tg = t?.term; if (tg) tagCount[tg] = (tagCount[tg] || 0) + 1; }
   const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
   await widget('kv', { pairs: topTags.map(([tg, n]) => [tg, `${n} objects`]) });
   ```

## Examples

### Mythology of Athena
```js
const r = await call('search-museum-objects', { q: 'Athena', hasImages: true, pageSize: 30 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
const worksWithImg = works.filter(w => w?.primaryImageSmall);
const images = worksWithImg.length
  ? worksWithImg.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.department ?? '—' }))
  : [{ src: '', alt: 'No image available', caption: '—' }];
await widget('gallery', { images });
```

### Horse across cultures
```js
const r = await call('search-museum-objects', { q: 'horse', hasImages: true, pageSize: 30 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 15).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
await widget('chart', { type: 'bar', data: [{ label: 'Asian', value: 6 }, { label: 'European', value: 4 }, { label: 'Greek', value: 3 }] });
```

## Common mistakes

- **Forgetting `tags: true`**: without it `q: "horse"` matches "Horse Guards" titles too — the tag flag forces the AAT/Wikidata-tagged subset
- **One single department**: the value is the cross-cultural mosaic — never restrict with `departmentId`
- **No grouping**: dumping 30 objects in one gallery loses the "across cultures" angle — group by `culture` in the cards
- **Tag noise**: top tags include generic ones like "Men" — pick semantically meaningful ones
- **Tiny sample**: a thematic journey needs ≥ 10 objects to be convincing
