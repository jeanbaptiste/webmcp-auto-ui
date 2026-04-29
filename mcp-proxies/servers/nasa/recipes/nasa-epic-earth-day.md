---
id: nasa-epic-earth-day
name: Full-disc views of Earth from DSCOVR/EPIC
description: Carousel of EPIC frames, sub-solar map and metadata
when: the user asks for views of Earth from space, EPIC images, or DSCOVR pictures of the planet
servers: [nasa]
tools_used: [nasa_epic]
data_type: Earth observation from L1
components_used: [carousel, map, kv]
layout:
  type: stack
  arrangement: carousel on top, sub-solar map in the middle, metadata below
---

## When to use

The user wants to see Earth seen from the L1 Lagrange point (1.5 million km away):
- "Pictures of Earth from DSCOVR"
- "EPIC view today"
- "Earth as seen from space"
- "Show me the rotating planet from NASA EPIC"

EPIC takes ~10-20 full-disc images per day; played as a carousel they reveal Earth's rotation. The map shows the centroid sub-solar point.

## How to use

```js
// 1. Fetch EPIC frames for a date (natural or enhanced collection)
const raw = await call('nasa_epic', {
  collection: 'natural',
  date: '2026-04-28'
}).catch(() => null);
const frames = (Array.isArray(raw) ? raw : []).filter(f => f);
if (frames.length === 0) return widget('text', { content: 'No EPIC frames for this date.' });

// EPIC image URL pattern
const firstDate = frames[0]?.date ?? '';
const dateParts = firstDate.slice(0, 10).split('-');
const baseUrl = dateParts.length === 3 ? `https://epic.gsfc.nasa.gov/archive/natural/${dateParts[0]}/${dateParts[1]}/${dateParts[2]}/png` : '';

// 2. Carousel of frames (chronological)
await widget('carousel', {
  items: frames.filter(f => f?.image && baseUrl).map(f => ({
    image: `${baseUrl}/${f.image}.png`,
    title: f?.caption || 'Earth — DSCOVR/EPIC',
    subtitle: f?.date ?? '—'
  }))
});

// 3. Map with sub-solar centroid markers
await widget('map', {
  center: [0, 0],
  zoom: 1,
  markers: frames.filter(f => Number.isFinite(f?.centroid_coordinates?.lat)).map(f => ({
    lat: f.centroid_coordinates.lat,
    lon: f.centroid_coordinates.lon,
    label: (f?.date ?? '').slice(11, 16),
    popup: `Sub-solar point at ${f?.date ?? '—'}`
  }))
});

// 4. Metadata
await widget('kv', {
  items: [
    { label: 'Frames', value: frames.length },
    { label: 'Collection', value: 'natural' },
    { label: 'First image', value: frames[0]?.date ?? '—' },
    { label: 'Last image', value: frames[frames.length - 1]?.date ?? '—' }
  ]
});
```

## Examples

### Today's natural collection
```js
const today = new Date().toISOString().slice(0, 10);
const raw = await call('nasa_epic', { collection: 'natural', date: today }).catch(() => null);
const frames = (Array.isArray(raw) ? raw : []).filter(f => f);
await widget('carousel', { items: frames.map(f => ({ image: epicUrl(f), subtitle: f?.date ?? '—' })) });
await widget('map', { center: [0, 0], zoom: 1, markers: frames.filter(f => Number.isFinite(f?.centroid_coordinates?.lat)).map(f => ({ lat: f.centroid_coordinates.lat, lon: f.centroid_coordinates.lon })) });
```

### Enhanced collection on a specific date
```js
const raw = await call('nasa_epic', { collection: 'enhanced', date: '2024-12-21' }).catch(() => null);
const frames = (Array.isArray(raw) ? raw : []).filter(f => f);
await widget('carousel', { items: frames.map(f => ({ image: epicUrl(f, 'enhanced'), title: f?.date ?? '—' })) });
await widget('kv', { items: [{ label: 'Solstice', value: '2024-12-21' }, { label: 'Frames', value: frames.length }] });
```

## Common mistakes

- Using `f.image` as a URL — it's only the filename, the full URL must be built from `archive/<collection>/YYYY/MM/DD/png/<image>.png`
- Skipping the date — EPIC keeps a rolling archive, default behaviour returns the most recent available which may be days old
- Forgetting `centroid_coordinates` for the map — it's a richer view than just plotting the timestamp
- Mixing `natural` and `enhanced` collections in the same carousel — the colour curves differ visibly
- Showing all 20 frames as static images — the magic is the rotation, prefer carousel or animation
