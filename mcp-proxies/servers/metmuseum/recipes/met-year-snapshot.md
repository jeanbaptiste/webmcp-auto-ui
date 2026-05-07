---
id: met-year-snapshot
name: Planetary snapshot of a single pivotal year
description: Cross-cultural gallery + timeline + cards by continent + contextual KV + stats for a single year
when: the user asks what was created in a specific year (1492, 1789, 1968)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: année pivot
components_used: [gallery, timeline, cards, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stats + kv at top, full-width gallery, timeline + cards at the bottom
---

## When to use

- "Works created in 1789"
- "The Met in 1492"
- "What about 1968 in the collection?"
- "Snapshot of art in 1900"

## How to use

1. **Pin a year window** (use a 30-year window — Met date filter is exclusive on `objectBeginDate`/`objectEndDate`, very narrow windows return almost nothing):
   ```js
   const year = 1900;
   const search = await call('search-museum-objects', {
     q: 'painting',
     dateBegin: year - 30, dateEnd: year + 30,
     hasImages: true,
     pageSize: 40
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: `No objects around ${year}.` });
   ```

2. **Fetch a sample** (small batch — Met bridge throttles parallel requests):
   ```js
   const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   ```

3. **Stats** (use `artistNationality` — `country` is rarely populated by the Met API):
   ```js
   const nationalities = [...new Set(works.map(w => w?.artistNationality).filter(Boolean))];
   await widget('stat-card', { label: `Met objects around ${year}`, value: Math.max(search?.total ?? works.length, 1), icon: 'calendar' });
   await widget('stat-card', { label: 'Nationalities represented', value: Math.max(nationalities.length, 1), icon: 'globe' });
   ```

4. **Contextual KV** (year significance):
   ```js
   await widget('kv', {
     rows: [
       ['Year', `${year}`],
       ['Hint', '1900 — turn of the century, Belle Époque, beginnings of modern art'],
       ['Sample size', String(works.length)],
       ['First object', works[0]?.title ?? '—']
     ]
   });
   ```

5. **Cross-cultural gallery**:
   ```js
   const images = works.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: `${w?.artistNationality || w?.culture || '—'} — ${w?.medium ?? '—'}` }));
   if (images.length) { await widget('gallery', { images }); } else { await widget('text', { content: 'No images available for this year.' }); }
   ```

6. **Timeline + cards by nationality**:
   ```js
   const tlEvents = works.map(w => ({ date: w?.objectDate ?? '—', title: w?.title ?? '(untitled)' }));
   if (tlEvents.length) { await widget('timeline', { events: tlEvents }); } else { await widget('text', { content: 'No timeline items available for this year.' }); }
   const byNat = works.reduce((acc, w) => { const k = w?.artistNationality || w?.culture || 'Unknown'; (acc[k] = acc[k] || []).push(w); return acc; }, {});
   const cardsItems = Object.entries(byNat).flatMap(([c, ws]) => ws.slice(0, 1).map(w => ({ title: c, subtitle: w?.title ?? '(untitled)', image: w?.primaryImageSmall, body: w?.artistDisplayName || w?.culture || '—' })));
   if (cardsItems.length) { await widget('cards', { items: cardsItems }); } else { await widget('text', { content: 'No cards to display for this year.' }); }
   ```

## Examples

### Snapshot of 1900
```js
const r = await call('search-museum-objects', { q: 'painting', dateBegin: 1870, dateEnd: 1930, hasImages: true, pageSize: 30 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const images = works.map(w => ({ src: w.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.artistNationality ?? '—' }));
if (images.length) { await widget('gallery', { images }); } else { await widget('text', { content: 'No images available for this year.' }); }
```

### 1869 across cultures
```js
const r = await call('search-museum-objects', { q: 'painting', dateBegin: 1840, dateEnd: 1900, hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const events = works.map(w => ({ date: w?.objectDate ?? '—', title: w?.title ?? '(untitled)' }));
if (events.length) { await widget('timeline', { events }); } else { await widget('text', { content: 'No timeline items available for this year.' }); }
```

## Common mistakes

- **Forgetting to set both `dateBegin` and `dateEnd` to the same year**: single-year filter requires both
- **Too few results**: `total` may be small for very specific years — set `pageSize: 40` and don't expect 100s
- **Negative years**: BCE years work too (`-1500` for 1500 BCE)
- **No country grouping**: a planetary snapshot is meaningless without showing the geography
- **Missing year context**: surface a one-line "what happened that year" KV — that's why the user asks
