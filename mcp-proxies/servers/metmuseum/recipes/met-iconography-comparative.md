---
id: met-iconography-comparative
name: Comparative iconography of a motif across cultures
description: Comparison gallery + cards grouped by culture + frequency chart + KV of related AAT terms
when: the user asks about a motif/symbol across cultures (dragon, lotus, rose, tree of life)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: iconographie comparée
components_used: [gallery, cards, chart, kv]
layout:
  type: grid
  columns: 2
  arrangement: full-width gallery at top, cards on a row, chart + kv at the bottom
---

## When to use

- "Iconography of the dragon in art"
- "The lotus across cultures"
- "Representations of the rose"
- "Tree of life in different traditions"

## How to use

1. **Search the motif with `tags: true`** for AAT/Wikidata-tagged hits:
   ```js
   const search = await call('search-museum-objects', {
     q: 'dragon',
     tags: true,
     hasImages: true,
     pageSize: 30
   });
   ```

2. **Fetch a wide sample**:
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 18).map(id => call('get-museum-object', { objectId: id })));
   const works = objs.map(o => o.object).filter(w => w.primaryImageSmall);
   ```

3. **Comparison gallery**:
   ```js
   await widget('gallery', {
     images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: `${w.culture || w.department} — ${w.objectDate}` }))
   });
   ```

4. **Cards grouped by culture**:
   ```js
   const byCulture = works.reduce((acc, w) => {
     const k = w.culture || w.department;
     (acc[k] = acc[k] || []).push(w);
     return acc;
   }, {});
   await widget('cards', {
     items: Object.entries(byCulture).flatMap(([culture, ws]) => ws.slice(0, 2).map(w => ({
       title: w.title, subtitle: culture, image: w.primaryImageSmall, body: w.objectDate
     })))
   });
   ```

5. **Frequency chart by century**:
   ```js
   const byCentury = works.reduce((acc, w) => {
     const c = Math.floor((w.objectBeginDate || 0) / 100) * 100;
     acc[c] = (acc[c] || 0) + 1; return acc;
   }, {});
   await widget('chart', { type: 'bar', data: Object.entries(byCentury).map(([k, v]) => ({ label: `${k}`, value: v })) });
   ```

6. **KV of related AAT/Wikidata terms**:
   ```js
   const tags = {};
   for (const w of works) for (const t of (w.tags || [])) tags[t.term] = (tags[t.term] || 0) + 1;
   const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8);
   await widget('kv', { pairs: top.map(([t, n]) => [t, `${n} co-occurrences`]) });
   ```

## Examples

### Dragon iconography
```js
const r = await call('search-museum-objects', { q: 'dragon', tags: true, hasImages: true, pageSize: 30 });
const objs = await Promise.all(r.objectIDs.slice(0, 15).map(id => call('get-museum-object', { objectId: id })));
const works = objs.map(o => o.object);
await widget('gallery', { images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: w.culture })) });
```

### Lotus across Asia
```js
const r = await call('search-museum-objects', { q: 'lotus', tags: true, departmentId: 6, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 12).map(id => call('get-museum-object', { objectId: id })));
await widget('cards', { items: objs.map(o => ({ title: o.object.title, subtitle: o.object.culture, image: o.object.primaryImageSmall })) });
```

## Common mistakes

- **Without `tags: true`** the motif matches any title containing the word — false positives like "Dragon Boat Hotel" — always set the tag flag
- **Single-culture restriction**: defeats the comparative angle — never set `departmentId` unless explicitly narrowing
- **Tag noise in the KV**: pick semantically relevant terms (filter out generic "Men", "Women", "Animals")
- **Image-less records**: many tag-only objects have no `primaryImageSmall` — filter post-fetch
- **No date axis**: a "dragon through time" chart only works if `objectBeginDate` is populated — fall back to a culture-based chart otherwise
