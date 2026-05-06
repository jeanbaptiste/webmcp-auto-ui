---
id: inat-biodiversity-area
name: Map biodiversity observations on a geographic area
description: Render a map of iNaturalist observations for a place plus species summary, photo gallery and key stats.
when: the user asks for a map of naturalist observations, the biodiversity of an area, the species present in a location, or iNaturalist observations in a region
servers: [inaturalist]
tools_used: [search_observations]
data_type: georeferenced observations with photos
components_used: [map, gallery, table, stat-card]
layout:
  type: grid
  columns: 2
  arrangement: full-width map at top, gallery + stats below
---

## When to use

- "What bird species are observed in Paris?"
- "Show me a map of butterfly observations in the Alps"
- "What is the biodiversity around Lake Annecy?"
- "Endangered species observed in Ile-de-France"
- "Reptiles within 20 km of Montpellier"

The iNaturalist server provides georeferenced observations with photos, taxa, dates, and observers — perfect for any "what lives there" question.

## How to use

```js
// 1. Search observations in the target area
const obs = await call('search_observations', {
  lat: 48.8566,
  lng: 2.3522,
  radius: 10,
  taxon_name: 'Aves',
  quality_grade: 'research',
  per_page: 100,
});

// 2. Map markers (replace "square" thumbnail with "medium" for better photos)
const results = obs?.results ?? [];
const markers = results
  .filter(o => o.geojson?.coordinates)
  .map(o => ({
    lat: o.geojson.coordinates[1],
    lon: o.geojson.coordinates[0],
    label: o.species_guess ?? o.taxon?.preferred_common_name ?? o.taxon?.name ?? '',
    popup: `${o.species_guess ?? o.taxon?.name ?? 'Unknown'} — ${o.observed_on ?? '—'}`,
  }));
await widget('map', { center: [48.8566, 2.3522], zoom: 12, markers, cluster: true });

// 3. Stat cards
const species = new Set(results.map(o => o.taxon?.id).filter(Boolean));
const observers = new Set(results.map(o => o.user?.id).filter(Boolean));
await widget('stat-card', { label: 'Observations', value: obs?.total_results ?? 0, icon: 'eye' });
await widget('stat-card', { label: 'Unique species', value: species.size, icon: 'leaf' });
await widget('stat-card', { label: 'Observers', value: observers.size, icon: 'users' });

// 4. Photo gallery (medium-sized thumbnails)
const images = results
  .filter(o => o.photos?.length > 0 && o.photos[0]?.url)
  .map(o => ({
    src: o.photos[0].url.replace('square', 'medium'),
    alt: o.species_guess ?? '',
    caption: `${o.place_guess ?? ''} — ${o.observed_on ?? '—'}`,
  }));
await widget('gallery', { images });

// 5. Species summary table
const counts = {};
for (const o of results) {
  const k = o.taxon?.name; if (!k) continue;
  counts[k] = (counts[k] || 0) + 1;
}
const rows = Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([name, n]) => [name, n]);
await widget('data-table', { columns: ['Species', 'Observations'], rows });
```

## Examples

### Birds of Paris
```js
const obs = await call('search_observations', {
  lat: 48.8566, lng: 2.3522, radius: 10,
  taxon_name: 'Aves', quality_grade: 'research', per_page: 100,
});
await widget('map', { center: [48.8566, 2.3522], zoom: 12, markers: (obs?.results ?? []).filter(o => o.geojson?.coordinates).map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0], label: o.species_guess ?? o.taxon?.name ?? '' })) });
```

### Butterflies around Chamonix
```js
const obs = await call('search_observations', {
  lat: 45.9237, lng: 6.8694, radius: 30,
  taxon_name: 'Lepidoptera', per_page: 100,
});
await widget('map', { center: [45.9237, 6.8694], zoom: 10, cluster: true, markers: (obs?.results ?? []).filter(o => o.geojson?.coordinates).map(o => ({ lat: o.geojson.coordinates[1], lon: o.geojson.coordinates[0], label: o.species_guess ?? o.taxon?.name ?? '' })) });
```

### Reptiles around Montpellier
```js
const obs = await call('search_observations', { lat: 43.6, lng: 3.9, radius: 20, taxon_name: 'Reptilia', per_page: 80 });
await widget('gallery', { images: (obs?.results ?? []).filter(o => o.photos?.length > 0 && o.photos[0]?.url).map(o => ({ src: o.photos[0].url.replace('square', 'medium'), caption: o.species_guess ?? o.taxon?.name ?? '' })) });
```

## Common mistakes

- **Radius too large**: a 100 km radius returns too many results — prefer 5-30 km and increase only if results are scarce
- **Default thumbnails are tiny squares (75x75)** — replace `"square"` with `"medium"` (200px) or `"large"` (500px) in the URL
- **No taxonomic filter** mixes plants + animals + fungi — always pass `taxon_name` if the user mentions a group
- **Forgetting `quality_grade: "research"`** brings in casual / unverified observations and hurts data quality
- **Wrong zoom level** for the radius (5 km → 13, 20 km → 11, 50 km → 9)
- **Not enabling map clustering** when there are 50+ markers — the map becomes unreadable
