---
id: met-public-domain-creative-pool
name: Public-domain pool of Met images ready for reuse
description: HD gallery + cards with dimensions + KV of license + stats for designers and educators
when: the user wants images they can reuse legally (book covers, presentations, free-use art)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: créatif / réutilisation
components_used: [gallery, cards, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stats at top, full-width gallery, cards + kv at the bottom
---

## When to use

- "Met works free to use"
- "Public domain art for my book cover"
- "High-resolution images I can download"
- "Open access flowers from the Met"

## How to use

1. **Search a theme with images**:
   ```js
   const search = await call('search-museum-objects', {
     q: 'still life flowers',
     hasImages: true,
     pageSize: 30
   });
   ```

2. **Fetch and filter `isPublicDomain`**:
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 20).map(id => call('get-museum-object', { objectId: id })));
   const all = objs.map(o => o.object);
   const free = all.filter(w => w.isPublicDomain && w.primaryImage);
   ```

3. **Stats** (free vs total):
   ```js
   await widget('stat-card', { label: 'Free to use', value: free.length, icon: 'unlock' });
   await widget('stat-card', { label: 'Total sampled', value: all.length, icon: 'archive' });
   await widget('stat-card', { label: 'Free ratio', value: `${Math.round(free.length / all.length * 100)}%`, icon: 'percent' });
   ```

4. **HD gallery** (point at `primaryImage` here, not the small one):
   ```js
   await widget('gallery', {
     images: free.map(w => ({ src: w.primaryImage, alt: w.title, caption: `${w.artistDisplayName || w.culture} — ${w.objectDate}` }))
   });
   ```

5. **Cards with dimensions and credit**:
   ```js
   await widget('cards', {
     items: free.map(w => ({
       title: w.title, subtitle: w.artistDisplayName,
       image: w.primaryImageSmall, body: `${w.dimensions} — ${w.creditLine}`
     }))
   });
   ```

6. **KV of license clarity**:
   ```js
   await widget('kv', {
     pairs: [
       ['Status', 'Public domain (CC0)'],
       ['Rights', free[0]?.rightsAndReproduction || 'Open access'],
       ['Source', 'metmuseum.org'],
       ['Recommended attribution', 'The Metropolitan Museum of Art, New York']
     ]
   });
   ```

## Examples

### Floral still lifes for a book cover
```js
const r = await call('search-museum-objects', { q: 'flowers vase', hasImages: true, pageSize: 30 });
const objs = await Promise.all(r.objectIDs.slice(0, 15).map(id => call('get-museum-object', { objectId: id })));
const free = objs.map(o => o.object).filter(w => w.isPublicDomain);
await widget('gallery', { images: free.map(w => ({ src: w.primaryImage, alt: w.title })) });
```

### Public-domain Egyptian fragments
```js
const r = await call('search-museum-objects', { q: 'pharaoh', departmentId: 10, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 10).map(id => call('get-museum-object', { objectId: id })));
const free = objs.map(o => o.object).filter(w => w.isPublicDomain);
await widget('cards', { items: free.map(w => ({ title: w.title, image: w.primaryImageSmall, body: w.creditLine })) });
```

## Common mistakes

- **Mixing public and copyrighted in the gallery**: `hasImages: true` does NOT mean "public domain" — always filter `isPublicDomain` after the fetch
- **`primaryImage` URLs sometimes 404**: check existence before listing them as downloads, or fall back to `primaryImageSmall`
- **No attribution mentioned**: even CC0 is good practice to credit — surface the credit line in the KV
- **Forgetting `rightsAndReproduction`**: when present, that field overrides the simple `isPublicDomain` flag (rare but real)
- **Only one search query**: a "creative pool" needs 15-20 free objects — sample 30 IDs and detail at least 15
