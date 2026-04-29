---
id: met-donor-provenance
name: Trace works given by a specific donor or bequest
description: Donor profile + bequest gallery + cards of major pieces + KV of the gift + stats
when: the user asks about a donor, bequest, or patronage line at the Met (Havemeyer, Lehman, Annenberg, Rockefeller)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: provenance / mécénat
components_used: [cards, gallery, profile, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: profile + stats at top, full-width gallery, cards + kv at the bottom
---

## When to use

- "Works bequeathed by the Havemeyers"
- "Bequest of Mrs. X at the Met"
- "Met collection from Robert Lehman"
- "What did Annenberg give to the Met?"

## How to use

1. **Search using the donor's name** as `q` (matches `creditLine`):
   ```js
   const search = await call('search-museum-objects', {
     q: 'Havemeyer',
     hasImages: true,
     pageSize: 50
   });
   ```

2. **Fetch and post-filter on `creditLine`**:
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 25).map(id => call('get-museum-object', { objectId: id })));
   const gift = objs.map(o => o.object).filter(w =>
     (w.creditLine || '').includes('Havemeyer') && w.primaryImageSmall
   );
   ```

3. **Donor profile** (text-based, no built-in bio):
   ```js
   await widget('profile', {
     name: 'H. O. Havemeyer Collection',
     subtitle: 'Bequest of Mrs. H. O. Havemeyer, 1929',
     stats: [
       { label: 'Works in sample', value: gift.length },
       { label: 'Year of bequest', value: '1929' }
     ]
   });
   ```

4. **Stats**:
   ```js
   const departments = [...new Set(gift.map(w => w.department))];
   await widget('stat-card', { label: 'Works given', value: search.total, icon: 'gift' });
   await widget('stat-card', { label: 'Departments touched', value: departments.length, icon: 'building' });
   ```

5. **Gallery of the bequest**:
   ```js
   await widget('gallery', {
     images: gift.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: `${w.artistDisplayName} — ${w.objectDate}` }))
   });
   ```

6. **Cards of major pieces + KV**:
   ```js
   await widget('cards', {
     items: gift.slice(0, 8).map(w => ({
       title: w.title, subtitle: w.artistDisplayName, image: w.primaryImageSmall, body: w.medium
     }))
   });
   await widget('kv', {
     pairs: [
       ['Donor', 'Havemeyer'],
       ['Total works', search.total],
       ['Sampled', gift.length],
       ['Departments', departments.join(', ')]
     ]
   });
   ```

## Examples

### Havemeyer bequest
```js
const r = await call('search-museum-objects', { q: 'Havemeyer', hasImages: true, pageSize: 50 });
const objs = await Promise.all(r.objectIDs.slice(0, 20).map(id => call('get-museum-object', { objectId: id })));
const gift = objs.map(o => o.object).filter(w => (w.creditLine || '').includes('Havemeyer'));
await widget('gallery', { images: gift.map(w => ({ src: w.primaryImageSmall, alt: w.title })) });
```

### Robert Lehman collection
```js
const r = await call('search-museum-objects', { q: 'Robert Lehman', hasImages: true, pageSize: 30 });
const objs = await Promise.all(r.objectIDs.slice(0, 12).map(id => call('get-museum-object', { objectId: id })));
const gift = objs.map(o => o.object).filter(w => (w.creditLine || '').includes('Lehman'));
await widget('cards', { items: gift.map(w => ({ title: w.title, subtitle: w.artistDisplayName, image: w.primaryImageSmall })) });
```

## Common mistakes

- **Trusting `q` alone**: it can match any text containing the name (titles, descriptions) — always filter `creditLine` after
- **Common surnames**: "Lehman" matches multiple donors and unrelated artists — use the full phrase ("Robert Lehman Collection")
- **Skipping the post-filter**: 30 hits often contain only 10 actual gifts — filter, don't trust the search
- **No year of bequest**: extract it from `creditLine` (e.g. "Bequest of ..., 1929") for the profile
- **Mixing departments**: famous donors gave across departments — surface the breakdown rather than hiding it
