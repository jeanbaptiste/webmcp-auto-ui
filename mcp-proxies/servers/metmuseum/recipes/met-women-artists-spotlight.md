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

1. **Search a relevant department** (e.g. American Paintings = 11):
   ```js
   const search = await call('search-museum-objects', {
     q: '*',
     departmentId: 11,
     hasImages: true,
     pageSize: 100
   });
   ```

2. **Fetch a wide sample** (the API only labels women artists with `artistGender`):
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 40).map(id => call('get-museum-object', { objectId: id })));
   const womenWorks = objs.map(o => o.object).filter(w => w.artistGender === 'Female' && w.primaryImageSmall);
   ```

3. **Profile the most-represented woman**:
   ```js
   const byArtist = womenWorks.reduce((acc, w) => { (acc[w.artistDisplayName] = acc[w.artistDisplayName] || []).push(w); return acc; }, {});
   const [topName, topWorks] = Object.entries(byArtist).sort((a, b) => b[1].length - a[1].length)[0] || [];
   if (topName) {
     await widget('profile', {
       name: topName,
       subtitle: topWorks[0].artistDisplayBio,
       stats: [{ label: 'Works in sample', value: topWorks.length }]
     });
   }
   ```

4. **Stats**:
   ```js
   const uniqueArtists = new Set(womenWorks.map(w => w.artistDisplayName)).size;
   await widget('stat-card', { label: 'Works by women', value: womenWorks.length, icon: 'palette' });
   await widget('stat-card', { label: 'Unique women artists', value: uniqueArtists, icon: 'users' });
   ```

5. **Multi-artist gallery + cards**:
   ```js
   await widget('gallery', { images: womenWorks.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: w.artistDisplayName })) });
   await widget('cards', { items: womenWorks.slice(0, 10).map(w => ({ title: w.title, subtitle: w.artistDisplayName, image: w.primaryImageSmall, body: w.objectDate })) });
   ```

6. **Chart by decade**:
   ```js
   const byDecade = womenWorks.reduce((acc, w) => {
     const dec = Math.floor((w.objectBeginDate || 0) / 10) * 10;
     acc[dec] = (acc[dec] || 0) + 1; return acc;
   }, {});
   await widget('chart', { type: 'bar', data: Object.entries(byDecade).map(([k, v]) => ({ label: `${k}s`, value: v })) });
   ```

## Examples

### American women painters
```js
const r = await call('search-museum-objects', { q: '*', departmentId: 11, hasImages: true, pageSize: 100 });
const objs = await Promise.all(r.objectIDs.slice(0, 40).map(id => call('get-museum-object', { objectId: id })));
const women = objs.map(o => o.object).filter(w => w.artistGender === 'Female');
await widget('cards', { items: women.map(w => ({ title: w.title, subtitle: w.artistDisplayName, image: w.primaryImageSmall })) });
```

### Mary Cassatt focused
```js
const r = await call('search-museum-objects', { q: 'Cassatt', artistOrCulture: true, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 8).map(id => call('get-museum-object', { objectId: id })));
await widget('profile', { name: 'Mary Cassatt', subtitle: objs[0]?.object.artistDisplayBio });
```

## Common mistakes

- **Expecting `artistGender: "Male"`**: the field is currently populated **only** with "Female" — male artists are unlabeled, the comparison isn't symmetric
- **Filter applied at search time**: there is no `artistGender` parameter — sampling + post-fetch filter is the only way
- **Tiny sample (5-10 objects)**: women are under-represented in the data — sample at least 30-40 records to find any
- **Missing bio**: not every work carries `artistDisplayBio` — pick the work with the richest bio for the profile
- **Confusing `constituents.gender`**: the constituent-level gender follows the same "Female-only" rule — same caveat applies
