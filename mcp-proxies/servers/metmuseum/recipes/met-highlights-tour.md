---
id: met-highlights-tour
name: Curated tour of Met highlights currently on view
description: Narrative cards + HD gallery + KV gallery numbers + stats, with a CTA to the Met Explorer
when: the user wants the must-see masterpieces or a curated visit (impressionism, Egyptian highlights, top picks)
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object, open-met-explorer]
data_type: curaté
components_used: [cards, gallery, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: stat-cards at top, full-width cards in the middle, gallery + KV at the bottom
---

## When to use

- "Met masterpieces"
- "Top impressionist works to absolutely see"
- "Egyptian highlights at the Met"
- "What's the must-see right now?"

## How to use

1. **Search highlights currently on view**:
   ```js
   const search = await call('search-museum-objects', {
     q: 'impressionism',
     isHighlight: true,
     isOnView: true,
     hasImages: true,
     pageSize: 20
   });
   ```

2. **Fetch detailed objects** (6-10):
   ```js
   const objs = await Promise.all(search.objectIDs.slice(0, 8).map(id => call('get-museum-object', { objectId: id })));
   const works = objs.map(o => o.object);
   ```

3. **Stats**:
   ```js
   await widget('stat-card', { label: 'Highlights on view', value: works.length, icon: 'star' });
   await widget('stat-card', { label: 'Public domain', value: works.filter(w => w.isPublicDomain).length, icon: 'unlock' });
   ```

4. **Narrative cards** (one masterpiece per card with gallery number):
   ```js
   await widget('cards', {
     items: works.map(w => ({
       title: w.title,
       subtitle: `${w.artistDisplayName || w.culture} — ${w.objectDate}`,
       image: w.primaryImageSmall,
       body: `Gallery ${w.GalleryNumber || '?'} — ${w.medium}`
     }))
   });
   ```

5. **HD gallery + KV directory**:
   ```js
   await widget('gallery', { images: works.map(w => ({ src: w.primaryImageSmall, alt: w.title, caption: `Gallery ${w.GalleryNumber}` })) });
   await widget('kv', { pairs: works.map(w => [w.title, `Gallery ${w.GalleryNumber || '?'}`]) });
   ```

6. **Handoff to the Met Explorer**:
   ```js
   await call('open-met-explorer', { q: 'impressionism', hasImages: true });
   ```

## Examples

### Impressionist must-sees
```js
const r = await call('search-museum-objects', { q: 'impressionism', isHighlight: true, isOnView: true, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 6).map(id => call('get-museum-object', { objectId: id })));
const works = objs.map(o => o.object);
await widget('cards', { items: works.map(w => ({ title: w.title, subtitle: w.artistDisplayName, image: w.primaryImageSmall, body: `Gallery ${w.GalleryNumber}` })) });
await call('open-met-explorer', { q: 'impressionism' });
```

### Egyptian highlights
```js
const r = await call('search-museum-objects', { q: 'pharaoh', departmentId: 10, isHighlight: true, hasImages: true });
const objs = await Promise.all(r.objectIDs.slice(0, 6).map(id => call('get-museum-object', { objectId: id })));
await widget('gallery', { images: objs.map(o => ({ src: o.object.primaryImageSmall, alt: o.object.title })) });
```

## Examples — common mistakes

## Common mistakes

- **Combining `isHighlight` with a too-narrow `q`**: highlights are fewer than 2,000 objects — broad themes work, hyper-specific queries return nothing
- **Forgetting `isOnView`**: a "tour" of pieces in storage isn't a tour — always pair with `isOnView: true`
- **No gallery number on the card**: the value of this recipe is the physical itinerary — surface `GalleryNumber` everywhere
- **Calling `open-met-explorer` first**: launch the explorer last, after rendering the briefing, otherwise the user sees the explorer pop and the cards never render
- **Confusing highlight with public domain**: `isHighlight` is a curatorial flag, `isPublicDomain` is a rights flag — they're independent
