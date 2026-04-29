---
id: inat-nearby-trail
name: What's around me — nearby naturalist trail
description: Mobile-friendly local naturalist briefing — nearby places map, recent observations gallery, AI suggestions for the spot.
when: the user asks "what's around me", what to observe nearby, things to see in a 5 km radius, or a hyper-local naturalist briefing
servers: [inaturalist]
tools_used: [nearby_places, search_observations, taxon_suggestions]
data_type: local places + recent obs + AI suggestions
components_used: [map, gallery, cards, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: map full-width, gallery + cards side-by-side, stats below
---

## When to use

- "What can I observe within 5 km of me?"
- "Species to look for around 47.21, -1.55"
- "Naturalist things to see at my current location"
- "Hyper-local biodiversity briefing"
- "Trailside wildlife near here"

## How to use

```js
// 1. Inputs
const lat = 47.21;
const lng = -1.55;
const radius = 5; // km

// 2. Nearby iNaturalist places (rough bounding box from radius)
const dLat = radius / 110;
const dLng = radius / (110 * Math.cos(lat * Math.PI / 180));
const places = await call('nearby_places', {
  swlat: lat - dLat, swlng: lng - dLng,
  nelat: lat + dLat, nelng: lng + dLng,
  per_page: 6,
});

// 3. Recent observations within the radius
const obs = await call('search_observations', {
  lat, lng, radius,
  per_page: 60, quality_grade: 'research',
});

// 4. AI taxon suggestions for here-and-now
const today = new Date().toISOString().slice(0, 10);
const sugg = await call('taxon_suggestions', {
  lat, lng, observed_on: today, limit: 6,
});

// 5. Render map (radius center + place markers + obs)
await widget('map', {
  center: [lat, lng],
  zoom: 13,
  markers: [
    { lat, lon: lng, label: 'You are here', popup: today },
    ...places.results.map(p => ({
      lat: Number(p.location?.split(',')[0]),
      lon: Number(p.location?.split(',')[1]),
      label: p.display_name,
    })),
  ],
});

// 6. Recent observations gallery
await widget('gallery', {
  images: obs.results.filter(o => o.photos?.length).slice(0, 12).map(o => ({
    src: o.photos[0].url.replace('square', 'medium'),
    caption: `${o.species_guess} — ${o.observed_on}`,
  })),
});

// 7. AI suggestions cards
await widget('cards', {
  items: sugg.results.map(s => ({
    title: s.taxon.preferred_common_name || s.taxon.name,
    subtitle: s.taxon.name,
    image: s.taxon.default_photo?.medium_url,
    description: `Frequency: ${s.frequency_score?.toFixed(2) ?? '—'}`,
  })),
});

// 8. Stats
await widget('stat-card', { label: 'Places nearby', value: places.results.length, icon: 'map' });
await widget('stat-card', { label: 'Recent obs', value: obs.total_results, icon: 'eye' });
await widget('stat-card', { label: 'AI suggestions', value: sugg.results.length, icon: 'sparkles' });
```

## Examples

### Around a Nantes park
```js
const lat = 47.21, lng = -1.55;
const obs = await call('search_observations', { lat, lng, radius: 3, per_page: 30, quality_grade: 'research' });
await widget('map', { center: [lat, lng], zoom: 14, markers: obs.results.map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0], label: o.species_guess })) });
```

### Trail suggestions in the Vosges
```js
const sugg = await call('taxon_suggestions', { lat: 48.27, lng: 7.10, observed_on: '2025-06-12', limit: 8 });
await widget('cards', { items: sugg.results.map(s => ({ title: s.taxon.preferred_common_name, subtitle: s.taxon.name, image: s.taxon.default_photo?.medium_url })) });
```

## Common mistakes

- **Bounding box from radius** — the simple `dLat = radius/110` formula fails near the poles; for high latitudes use a proper geo library
- **Radius too large** — beyond 10 km you're not "around me" anymore; cap at 3-10 km
- **No `quality_grade`** — casual obs from passers-by clutter the gallery
- **Forgetting today's date** — `taxon_suggestions` needs `observed_on`, hardcode `new Date().toISOString().slice(0, 10)`
- **Treating `place.location` as `[lat, lon]`** — it's a `"lat,lng"` comma string, parse with `.split(',').map(Number)`
- **Mixing zoom levels** — for a 5 km radius use zoom 13; 3 km → 14; 10 km → 12
