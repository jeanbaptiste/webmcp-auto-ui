---
id: met-women-artists-spotlight
name: Spotlight on women artists in the Met collection
description: Profile of the most-represented woman + multi-artist gallery + cards + chart by decade + stats
when: the user asks about women artists at the Met or wants a gender-aware reading of the collection
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: genre / études
components_used: [profile, gallery, cards, chart, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: profile + stats at top, gallery + cards in the middle, chart at the bottom
---

## When to use

- "Women artists at the Met"
- "Female painters in the Met collection"
- "Mary Cassatt and other women at the Met"
- "How well represented are women artists?"

## How to use

1. **Search by name of well-known women artists** (the Met API does NOT populate `artistGender` reliably — query by artist name instead):
   ```js
   const search = await call('search-museum-objects', {
     q: 'Cassatt',
     hasImages: true,
     pageSize: 100
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No objects.' });
   ```

2. **Fetch a wide sample** and keep works whose `artistDisplayName` matches one of a known list of women artists (fall back to the broader sample if filter yields nothing — Met full-text search across `q` is noisy):
   ```js
   const objs = await Promise.all(ids.slice(0, 40).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
   const FEMALE = ['Cassatt', 'Morisot', 'Bonheur', 'Vigée Le Brun', 'Vigee Le Brun', 'O\'Keeffe', 'Kahlo', 'Kollwitz', 'Bourgeois', 'Sherman', 'Goncharova', 'Hepworth'];
   const all = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
   const womenWorks = all.filter(w => w?.artistDisplayName && FEMALE.some(n => w.artistDisplayName.includes(n)));
   const display = womenWorks.length > 0 ? womenWorks : all.slice(0, 10);
   ```

3. **Profile the most-represented woman** (or fallback first artist):
   ```js
   const byArtist = display.reduce((acc, w) => { const k = w?.artistDisplayName ?? '—'; (acc[k] = acc[k] || []).push(w); return acc; }, {});
   const [topName, topWorks] = Object.entries(byArtist).sort((a, b) => b[1].length - a[1].length)[0] || [];
   if (topName) {
     await widget('profile', {
       name: topName,
       subtitle: topWorks[0]?.artistDisplayBio ?? '',
       stats: [{ label: 'Works in sample', value: topWorks.length }]
     });
   }
   ```

4. **Stats**:
   ```js
   const uniqueArtists = new Set(display.map(w => w?.artistDisplayName).filter(Boolean)).size;
   await widget('stat-card', { label: 'Works by women', value: Math.max(womenWorks.length || display.length, 1), icon: 'palette' });
   await widget('stat-card', { label: 'Unique women artists', value: Math.max(uniqueArtists, 1), icon: 'users' });
   ```

5. **Multi-artist gallery + cards**:
   ```js
   const images = display.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.artistDisplayName ?? '—' }));
   await widget('gallery', { images: images.length ? images : [{ src: '', alt: 'No samples', caption: '—' }] });
   const items = display.slice(0, 10).map(w => ({ title: w?.title ?? '(untitled)', subtitle: w?.artistDisplayName ?? '—', image: w?.primaryImageSmall, body: w?.objectDate ?? '—' }));
   await widget('cards', { items: items.length ? items : [{ title: 'No samples', subtitle: '—' }] });
   ```

6. **Chart by decade**:
   ```js
   const byDecade = display.reduce((acc, w) => { const dec = Math.floor((w?.objectBeginDate || 0) / 10) * 10; acc[dec] = (acc[dec] || 0) + 1; return acc; }, {});
   const bars = Object.entries(byDecade).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => [`${k}s`, Number(v)]);
   await widget('chart', { bars: bars.length > 0 ? bars : [['sample', display.length || 1]] });
   ```

## Examples

### American women painters (Cassatt sample)
```js
const r = await call('search-museum-objects', { q: 'Cassatt', hasImages: true, pageSize: 100 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const all = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
const women = all.filter(w => (w?.artistDisplayName || '').includes('Cassatt'));
const display = women.length > 0 ? women : all;
const items = display.map(w => ({ title: w?.title ?? '(untitled)', subtitle: w?.artistDisplayName ?? '—', image: w?.primaryImageSmall }));
await widget('cards', { items: items.length ? items : [{ title: 'No samples', subtitle: '—' }] });
```

### Mary Cassatt focused
```js
const r = await call('search-museum-objects', { q: 'Cassatt', hasImages: true }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => (w?.artistDisplayName || '').includes('Cassatt'));
await widget('profile', { name: 'Mary Cassatt', subtitle: works[0]?.artistDisplayBio ?? '' });
```

## Common mistakes

- **Expecting `artistGender: "Male"`**: the field is currently populated **only** with "Female" — male artists are unlabeled, the comparison isn't symmetric
- **Filter applied at search time**: there is no `artistGender` parameter — sampling + post-fetch filter is the only way
- **Tiny sample (5-10 objects)**: women are under-represented in the data — sample at least 30-40 records to find any
- **Missing bio**: not every work carries `artistDisplayBio` — pick the work with the richest bio for the profile
- **Confusing `constituents.gender`**: the constituent-level gender follows the same "Female-only" rule — same caveat applies
