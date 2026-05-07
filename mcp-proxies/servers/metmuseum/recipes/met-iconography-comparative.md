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

1. **Search the motif** (Met API: `tags: true` filter currently returns 0 — use a plain `q` search):
   ```js
   const search = await call('search-museum-objects', {
     q: 'dragon',
     hasImages: true,
     pageSize: 30
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No matching motif.' });
   ```

2. **Fetch a sample and render all widgets** (small batch — Met bridge throttles parallel requests):
   ```js
   const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   if (works.length === 0) { await widget('text', { content: 'No image-bearing records found for this motif. Try a broader search term.' }); return; }

   // Comparison gallery
   const images = works.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: `${w?.culture || w?.department || '—'} — ${w?.objectDate ?? '—'}` }));
   await widget('gallery', { images });

   // Cards grouped by culture
   const byCulture = works.reduce((acc, w) => { const cult = w?.culture || w?.department || '—'; (acc[cult] = acc[cult] || []).push(w); return acc; }, {});
   const cardItems = Object.entries(byCulture).flatMap(([culture, ws]) => ws.slice(0, 2).map(w => ({ title: w?.title ?? '(untitled)', subtitle: culture, image: w?.primaryImageSmall, body: w?.objectDate ?? '—' })));
   await widget('cards', { items: cardItems });

   // Frequency chart by century
   const byCentury = works.reduce((acc, w) => { const century = Math.floor((w?.objectBeginDate || 0) / 100) * 100; acc[century] = (acc[century] || 0) + 1; return acc; }, {});
   const data = Object.entries(byCentury).map(([k, v]) => ({ label: `${Number(k) + 100}s`, value: v }));
   if (data.length > 0) await widget('chart', { bars: data.map(d => [d.label, d.value]) });

   // KV of related AAT/Wikidata terms
   const tags = {};
   for (const w of works) for (const t of (w?.tags ?? [])) { const tg = t?.term; if (tg) tags[tg] = (tags[tg] || 0) + 1; }
   const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8);
   if (top.length > 0) await widget('kv', { pairs: top.map(([t, n]) => [t, `${n} co-occurrences`]) });
   ```

## Examples

### Dragon iconography
```js
const r = await call('search-museum-objects', { q: 'dragon', hasImages: true, pageSize: 30 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
if (works.length === 0) { await widget('text', { content: 'No image-bearing records found for this motif. Try a broader search term.' }); return; }
const images = works.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.culture ?? '—' }));
await widget('gallery', { images });
```

### Lotus across Asia
```js
const r = await call('search-museum-objects', { q: 'lotus', departmentId: 6, hasImages: true, pageSize: 20 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
if (works.length === 0) { await widget('text', { content: 'No image-bearing records found for this motif. Try a broader search term.' }); return; }
const items = works.map(w => ({ title: w?.title ?? '(untitled)', subtitle: w?.culture ?? '—', image: w?.primaryImageSmall }));
await widget('cards', { items });
```

## Common mistakes

- **Without `tags: true`** the motif matches any title containing the word — false positives like "Dragon Boat Hotel" — always set the tag flag
- **Single-culture restriction**: defeats the comparative angle — never set `departmentId` unless explicitly narrowing
- **Tag noise in the KV**: pick semantically relevant terms (filter out generic "Men", "Women", "Animals")
- **Image-less records**: many tag-only objects have no `primaryImageSmall` — filter post-fetch
- **No date axis**: a "dragon through time" chart only works if `objectBeginDate` is populated — fall back to a culture-based chart otherwise
