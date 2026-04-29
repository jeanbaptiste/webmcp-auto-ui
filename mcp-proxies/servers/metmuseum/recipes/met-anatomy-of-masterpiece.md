---
id: met-anatomy-of-masterpiece
name: Anatomy of a masterpiece — multi-view zoom on a single object
description: Carousel of additional views + KV of 30 fields + sister-works cards + narrative text
when: the user asks for details, multi-views, or a deep dive into one specific artwork
servers: [metmuseum]
tools_used: [search-museum-objects, get-museum-object]
data_type: mono-objet zoom
components_used: [carousel, kv, cards, text]
layout:
  type: grid
  columns: 1
  arrangement: full-width carousel at top, narrative text, KV + sister-works cards
---

## When to use

- "Detail of Vermeer's painting"
- "Show me all views of this object"
- "Back of this sculpture too"
- "Deep-dive into one piece"

## How to use

1. **Locate one object** with multiple views:
   ```js
   const search = await call('search-museum-objects', {
     q: 'Las Meninas',
     title: true,
     hasImages: true
   });
   const top = search.objectIDs[0];
   ```

2. **Fetch full record with images**:
   ```js
   const { object: w } = await call('get-museum-object', { objectId: top, returnImage: true });
   ```

3. **Carousel of every view** (primary + additional):
   ```js
   await widget('carousel', {
     items: [w.primaryImage, ...(w.additionalImages || [])].filter(Boolean).map((src, i) => ({
       src,
       caption: i === 0 ? 'Primary view' : `Additional view ${i}`
     }))
   });
   ```

4. **Narrative text** with period/dynasty/reign context:
   ```js
   await widget('text', {
     content: `${w.title}, by ${w.artistDisplayName || w.culture}, ${w.objectDate}. ` +
       `${w.period ? `Period: ${w.period}. ` : ''}${w.dynasty ? `Dynasty: ${w.dynasty}. ` : ''}` +
       `${w.reign ? `Reign of ${w.reign}. ` : ''}${w.creditLine || ''}`
   });
   ```

5. **KV of detailed fields** (full record):
   ```js
   await widget('kv', {
     pairs: [
       ['Artist', w.artistDisplayName],
       ['Bio', w.artistDisplayBio],
       ['Date', w.objectDate],
       ['Medium', w.medium],
       ['Dimensions', w.dimensions],
       ['Department', w.department],
       ['Classification', w.classification],
       ['Culture', w.culture],
       ['Period', w.period],
       ['Dynasty', w.dynasty],
       ['Reign', w.reign],
       ['Credit', w.creditLine],
       ['Gallery', w.GalleryNumber],
       ['Public domain', w.isPublicDomain ? 'Yes' : 'No'],
       ['Tags', (w.tags || []).map(t => t.term).join(', ')]
     ].filter(([_, v]) => v)
   });
   ```

6. **Sister works** (same artist):
   ```js
   if (w.artistDisplayName) {
     const sis = await call('search-museum-objects', { q: w.artistDisplayName, artistOrCulture: true, hasImages: true });
     const sisObjs = await Promise.all(sis.objectIDs.slice(0, 4).filter(id => id !== top).map(id => call('get-museum-object', { objectId: id })));
     await widget('cards', { items: sisObjs.map(o => ({ title: o.object.title, image: o.object.primaryImageSmall, body: o.object.objectDate })) });
   }
   ```

## Examples

### A Vermeer with verso/details
```js
const s = await call('search-museum-objects', { q: 'Vermeer', artistOrCulture: true, hasImages: true });
const { object: w } = await call('get-museum-object', { objectId: s.objectIDs[0], returnImage: true });
await widget('carousel', { items: [w.primaryImage, ...(w.additionalImages || [])].map(src => ({ src })) });
```

### Egyptian fragment with reign context
```js
const s = await call('search-museum-objects', { q: 'Akhenaten', isHighlight: true, hasImages: true });
const { object: w } = await call('get-museum-object', { objectId: s.objectIDs[0] });
await widget('text', { content: `Reign: ${w.reign}. Period: ${w.period}.` });
await widget('carousel', { items: (w.additionalImages || []).map(src => ({ src })) });
```

## Common mistakes

- **Picking an object without `additionalImages`**: many records have only `primaryImage` — pick `isHighlight: true` candidates that tend to be richer
- **Empty additionalImages array**: always default to `[]` to avoid `undefined` spread
- **Carousel with one slide**: there's nothing to carousel — fall back to a single image if `additionalImages` is empty
- **Forgetting context fields**: this recipe's value is the depth — show `period`, `dynasty`, `reign` even if redundant in `objectDate`
- **No sister-works fallback**: for ancient or anonymous objects there's no `artistDisplayName` — gracefully skip the cards section
