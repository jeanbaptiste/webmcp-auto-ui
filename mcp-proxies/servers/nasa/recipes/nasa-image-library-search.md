---
id: nasa-image-library-search
name: Search NASA's media archive (images, videos, audio)
description: Visual search engine with KPI stats, gallery and detailed cards
when: the user searches for NASA pictures, Apollo footage, James Webb pictures or videos of a launch
servers: [nasa]
tools_used: [nasa_images]
data_type: archived media
components_used: [gallery, cards, stat-card]
layout:
  type: stack
  arrangement: KPI stats on top, gallery in the middle, descriptive cards below
---

## When to use

The user looks for media in NASA's vast archive (millions of items spanning Mercury → JWST):
- "NASA pictures of Apollo 11"
- "James Webb telescope videos"
- "Saturn V launch footage"
- "Photos of the ISS"
- "Audio recordings from Apollo"

The recipe transforms the JSON-heavy `images-api.nasa.gov` response into a browsable gallery.

## How to use

```js
// 1. Search the media library
const res = await call('nasa_images', {
  q: 'Apollo 11 moonwalk',
  media_type: 'image',
  year_start: '1969',
  year_end: '1969'
});
const items = res.collection?.items || [];

// 2. Headline stats
await widget('stat-card', { label: 'Results', value: res.collection?.metadata?.total_hits ?? items.length, icon: 'image' });
await widget('stat-card', { label: 'Showing', value: items.length, icon: 'eye' });
await widget('stat-card', { label: 'Media type', value: 'image', icon: 'camera' });

// 3. Gallery of preview images
await widget('gallery', {
  images: items
    .filter(it => (it.links || [])[0]?.href)
    .map(it => ({
      src: it.links[0].href,
      alt: it.data[0]?.title || 'NASA media',
      caption: it.data[0]?.date_created?.slice(0, 10)
    }))
});

// 4. Cards with title + description + center
await widget('cards', {
  items: items.map(it => ({
    title: it.data[0]?.title,
    subtitle: it.data[0]?.center,
    image: it.links?.[0]?.href,
    description: (it.data[0]?.description || '').slice(0, 200)
  }))
});
```

## Examples

### Apollo 11
```js
const res = await call('nasa_images', { q: 'Apollo 11', media_type: 'image', year_start: '1969', year_end: '1969' });
const items = res.collection.items;
await widget('stat-card', { label: 'Apollo 11 photos', value: res.collection.metadata.total_hits });
await widget('gallery', { images: items.slice(0, 30).map(it => ({ src: it.links[0].href, alt: it.data[0].title })) });
```

### JWST videos this year
```js
const res = await call('nasa_images', { q: 'James Webb', media_type: 'video', year_start: '2024', year_end: '2026' });
const items = res.collection.items;
await widget('stat-card', { label: 'JWST videos', value: items.length });
await widget('cards', { items: items.map(it => ({ title: it.data[0].title, subtitle: it.data[0].date_created.slice(0, 4), description: (it.data[0].description || '').slice(0, 160) })) });
```

## Common mistakes

- Using the result `href` as a download URL — it points to a JSON manifest, the actual file URLs are inside (`asset` endpoint)
- Forgetting to filter items missing `links[0]` — audio results often have no preview image
- Asking very generic queries (`space`, `nasa`) — NASA returns capped 100 items; refine with `year_start`/`year_end`
- Mixing media types without indicating it — display `media_type` clearly so users understand video previews are still images
- Showing 1000 results in one gallery — paginate via `page` and slice to ~30-50 per render
