---
id: met-artist-monograph
name: Build a mini-monograph of an artist from the Met collection
description: Bio + chronological gallery + detailed cards + stats for what the Met owns of a given artist
when: the user asks what the Met owns of a specific artist (Van Gogh, Vermeer, Hokusai, Cassatt...)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: monographique
components_used: [profile, gallery, cards, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: profile + stats at top, full-width gallery in the middle, cards at the bottom
---

## When to use

- "Show me Van Gogh's works at the Met"
- "What does the Met own by Vermeer?"
- "Hokusai at the Metropolitan"
- "Mary Cassatt collection at the Met"
- "Cezanne paintings at the Met"

## How to use

1. **Search by artist** with `artistOrCulture: true` for relevance:
   ```js
   const search = await call('search-museum-objects', {
     q: 'Vincent van Gogh',
     artistOrCulture: true,
     hasImages: true,
     pageSize: 30
   }).catch(() => null);
   const ids = search?.objectIDs ?? [];
   if (ids.length === 0) await widget('text', { content: 'No works found.' });
   ```

2. **Fetch details** for the first 8-10 results:
   ```js
   const objects = await Promise.all(
     ids.slice(0, 8).map(id => call('get-museum-object', { objectId: id }).catch(() => null))
   );
   const works = objects.filter(r => r?.object && !r?.message).map(r => r.object).filter(o => o?.primaryImageSmall);
   if (works.length === 0) await widget('text', { content: 'No works with images found.' });
   ```

3. **Build the artist profile** from any work (bio is on every record):
   ```js
   const ref = works[0];
   await widget('profile', {
     name: ref?.artistDisplayName ?? '—',
     subtitle: ref?.artistDisplayBio ?? '',
     stats: [
       { label: 'Born', value: ref?.artistBeginDate ?? '—' },
       { label: 'Died', value: ref?.artistEndDate ?? '—' },
       { label: 'Nationality', value: ref?.artistNationality ?? '—' }
     ]
   });
   ```

4. **Stats** (count, on-view, public domain):
   ```js
   await widget('stat-card', { label: 'Works at the Met', value: search?.total ?? works.length, icon: 'palette' });
   await widget('stat-card', { label: 'Public domain', value: works.filter(w => w?.isPublicDomain).length, icon: 'unlock' });
   ```

5. **Chronological gallery** sorted by `objectBeginDate`:
   ```js
   const sorted = [...works].sort((a, b) => (a?.objectBeginDate || 0) - (b?.objectBeginDate || 0));
   await widget('gallery', {
     images: sorted.map(w => ({
       src: w?.primaryImageSmall,
       alt: `${w?.title ?? '(untitled)'} (${w?.objectDate ?? '—'})`,
       caption: `${w?.objectDate ?? '—'} — ${w?.medium ?? '—'}`
     }))
   });
   ```

6. **Detail cards**:
   ```js
   await widget('cards', {
     items: sorted.map(w => ({
       title: w?.title ?? '(untitled)',
       subtitle: w?.objectDate ?? '—',
       image: w?.primaryImageSmall,
       body: [w?.medium, w?.GalleryNumber && `Gallery ${w.GalleryNumber}`].filter(Boolean).join(' — ')
     }))
   });
   ```

## Examples

### Vermeer at the Met
```js
const r = await call('search-museum-objects', { q: 'Vermeer', hasImages: true, pageSize: 30 }).catch(() => null);
const ids = r?.objectIDs ?? [];
if (ids.length === 0) await widget('text', { content: 'No results.' });
const objs = await Promise.all(ids.slice(0, 6).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object).filter(w => w?.primaryImageSmall);
await widget('profile', { name: 'Johannes Vermeer', subtitle: works[0]?.artistDisplayBio ?? '' });
await widget('gallery', { images: works.map(w => ({ src: w?.primaryImageSmall, alt: w?.title ?? '(untitled)', caption: w?.objectDate ?? '—' })) });
```

### Hokusai prints
```js
const r = await call('search-museum-objects', { q: 'Hokusai', hasImages: true, departmentId: 6 }).catch(() => null);
const ids = r?.objectIDs ?? [];
const objs = await Promise.all(ids.slice(0, 10).map(id => call('get-museum-object', { objectId: id }).catch(() => null)));
const works = objs.filter(o => o?.object).map(o => o.object);
await widget('cards', { items: works.map(w => ({ title: w?.title ?? '(untitled)', subtitle: w?.objectDate ?? '—', image: w?.primaryImageSmall })) });
```

## Common mistakes

- **Forgetting `artistOrCulture: true`**: a plain `q` matches title text and pollutes the results — always set the flag for monographs
- **Too many `get-museum-object` calls**: searches return up to 100 IDs; fetching all of them is slow and wasteful — cap at 8-10
- **Missing images**: many ancient works have no `primaryImage` — combine `hasImages: true` with a `filter(o => o.primaryImageSmall)` post-fetch
- **Wrong sort order**: artists span decades — sort by `objectBeginDate` (numeric) not `objectDate` (string)
- **Using `primaryImage` in a gallery**: the original-resolution URL is heavy and sometimes 404s — prefer `primaryImageSmall`
- **Showing "Unknown" as the bio**: not every record carries `artistDisplayBio` — pick the one that has it as the profile reference
