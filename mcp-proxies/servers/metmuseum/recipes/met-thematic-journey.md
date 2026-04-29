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

1. **Search the theme with `tags: true`** (forces tag-indexed records):
   ```js
   const search = await call('search-museum-objects', {
     q: 'Athena mythology',
     tags: true,
     hasImages: true,
     pageSize: 30
   });
   ```

2. **Fetch a wide sample** (10-15) and keep the ones with images and tags:
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 15).map(id => call('get-museum-object', { objectId: id })));
   const works = objs.map(o => o.object).filter(w => w.primaryImageSmall);
   ```

3. **Mosaic gallery** (visual cross-section):
   ```js
   await widget('gallery', {
     images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: `${w.culture || w.department} — ${w.objectDate}` }))
   });
   ```

4. **Cards grouped by culture**:
   ```js
   const byCulture = Object.entries(works.reduce((acc, w) => {
     const k = w.culture || w.department || 'Unknown';
     (acc[k] = acc[k] || []).push(w);
     return acc;
   }, {}));
   await widget('cards', {
     items: byCulture.flatMap(([culture, ws]) => ws.slice(0, 2).map(w => ({
       title: w.title, subtitle: culture, image: w.primaryImageSmall, body: w.objectDate
     })))
   });
   ```

5. **Chart of departments touched**:
   ```js
   const byDept = works.reduce((acc, w) => { acc[w.department] = (acc[w.department] || 0) + 1; return acc; }, {});
   await widget('chart', { type: 'bar', data: Object.entries(byDept).map(([k, v]) => ({ label: k, value: v })) });
   ```

6. **KV of shared tags**:
   ```js
   const tagCount = {};
   for (const w of works) for (const t of (w.tags || [])) tagCount[t.term] = (tagCount[t.term] || 0) + 1;
   const top = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
   await widget('kv', { pairs: top.map(([term, n]) => [term, `${n} objects`]) });
   ```

## Examples

### Mythology of Athena
```js
const r = await call('search-museum-objects', { q: 'Athena', tags: true, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 12).map(id => call('get-museum-object', { objectId: id })));
const works = objs.map(o => o.object);
await widget('gallery', { images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: w.department })) });
```

### Horse across cultures
```js
const r = await call('search-museum-objects', { q: 'horse', tags: true, hasImages: true, pageSize: 30 });
const objs = await Promise.all(r.objectIDs.slice(0, 15).map(id => call('get-museum-object', { objectId: id })));
await widget('chart', { type: 'bar', data: [{ label: 'Asian', value: 6 }, { label: 'European', value: 4 }, { label: 'Greek', value: 3 }] });
```

## Common mistakes

- **Forgetting `tags: true`**: without it `q: "horse"` matches "Horse Guards" titles too — the tag flag forces the AAT/Wikidata-tagged subset
- **One single department**: the value is the cross-cultural mosaic — never restrict with `departmentId`
- **No grouping**: dumping 30 objects in one gallery loses the "across cultures" angle — group by `culture` in the cards
- **Tag noise**: top tags include generic ones like "Men" — pick semantically meaningful ones
- **Tiny sample**: a thematic journey needs ≥ 10 objects to be convincing
