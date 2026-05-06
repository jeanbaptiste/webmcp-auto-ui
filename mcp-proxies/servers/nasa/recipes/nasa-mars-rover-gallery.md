---
id: nasa-mars-rover-gallery
name: Mars rover photo gallery for a sol or earth date
description: HD gallery with mission KPIs, per-camera cards and rover metadata
when: the user asks for photos taken by Curiosity, Perseverance, Opportunity or Spirit on Mars
servers: [nasa]
tools_used: [nasa_mars_rover]
data_type: martian rover imagery
components_used: [gallery, cards, kv, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: KPI stat-cards on top, full-width gallery below, per-camera cards + mission kv at the bottom
---

## When to use

The user requests rover photos by mission day or earth date:
- "Photos from Curiosity on Mars sol 1000"
- "Latest pictures from Perseverance"
- "Pictures Opportunity took on 2018-06-10"
- "Show me Spirit's panoramas"

Rovers have 7 to 10 cameras (FHAZ, RHAZ, MAST, NAVCAM, MAHLI, MARDI, CHEMCAM…) and can return hundreds of photos for a single sol. The recipe groups them by camera so the result is readable.

## How to use

```js
// 1. Fetch raw photo dump for a sol or earth date
const data = await call('nasa_mars_rover', {
  rover: 'curiosity',
  sol: 1000
}).catch(() => null);
const photos = (data?.photos ?? []).filter(p => p);
if (photos.length === 0) return widget('text', { content: 'No photos for this sol.' });

// 2. Group by camera
const byCamera = {};
for (const p of photos) {
  const c = p?.camera?.name ?? 'UNKNOWN';
  (byCamera[c] = byCamera[c] || []).push(p);
}
const cameras = Object.keys(byCamera);

// 3. Mission KPIs
await widget('stat-card', { label: 'Photos', value: photos.length, icon: 'camera' });
await widget('stat-card', { label: 'Sol', value: photos[0]?.sol ?? 'n/a', icon: 'sun' });
await widget('stat-card', { label: 'Cameras active', value: cameras.length, icon: 'aperture' });

// 4. Full-resolution gallery (HD)
await widget('gallery', {
  images: photos.slice(0, 60).filter(p => p?.img_src).map(p => ({
    src: p.img_src,
    alt: `${p?.camera?.full_name ?? '—'} — sol ${p?.sol ?? '—'}`,
    caption: `${p?.camera?.name ?? '—'} — ${p?.earth_date ?? '—'}`
  }))
});

// 5. Per-camera cards
await widget('cards', {
  items: cameras.map(c => ({
    title: c,
    subtitle: `${byCamera[c].length} photos`,
    image: byCamera[c][0]?.img_src,
    description: byCamera[c][0]?.camera?.full_name ?? '—'
  }))
});

// 6. Rover metadata
const r = photos[0]?.rover;
await widget('kv', {
  items: [
    { label: 'Rover', value: r?.name ?? '—' },
    { label: 'Status', value: r?.status ?? '—' },
    { label: 'Landing', value: r?.landing_date ?? '—' },
    { label: 'Launch', value: r?.launch_date ?? '—' },
    { label: 'Total photos', value: r?.total_photos ?? '—' }
  ]
});
```

## Examples

### Curiosity, sol 1000
```js
const data = await call('nasa_mars_rover', { rover: 'curiosity', sol: 1000 }).catch(() => null);
const photos = (data?.photos ?? []).filter(p => p);
const images = photos.slice(0, 40).filter(p => p?.img_src).map(p => ({ src: p.img_src, caption: p?.camera?.name ?? '—' }));
await widget('stat-card', { label: 'Photos', value: Math.max(photos.length, 1) });
if (images.length === 0) return widget('text', { content: 'No photos for this sol.' });
await widget('gallery', { images });
```

### Perseverance by earth date
```js
const data = await call('nasa_mars_rover', { rover: 'perseverance', earth_date: '2026-04-15' }).catch(() => null);
const photos = (data?.photos ?? []).filter(p => p);
const images = photos.slice(0, 60).filter(p => p?.img_src).map(p => ({ src: p.img_src, alt: p?.camera?.full_name ?? '—' }));
if (images.length === 0) return widget('text', { content: 'No photos for this date.' });
await widget('gallery', { images });
await widget('kv', { items: [{ label: 'Rover', value: 'Perseverance' }, { label: 'Sol', value: photos[0]?.sol ?? '—' }] });
```

## Common mistakes

- Using `sol` and `earth_date` together — the API rejects it, choose one
- Showing all photos at once — a sol may return 600+ photos, slice to ~50-100 for the gallery
- Forgetting the rover field is required — the call fails without `rover`
- Ignoring the per-camera structure — a flat gallery hides the scientific context (FHAZ vs MAST is meaningful)
- Hardcoding rover status — pull it from `photos[0].rover.status` instead, it changes
