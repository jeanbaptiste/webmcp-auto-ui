---
id: nasa-gibs-layers-explorer
name: Explore satellite imagery layers via NASA GIBS
description: Multi-layer satellite map with descriptive cards and technical kv
when: the user asks for satellite imagery, MODIS, true colour map, aerosol layers, snow cover or any GIBS product
servers: [nasa]
tools_used: [nasa_gibs]
data_type: satellite tile imagery
components_used: [map, cards, kv]
layout:
  type: grid
  columns: 2
  arrangement: full-width map at top, layer cards + technical kv stacked below
---

## When to use

The user requests Earth-observation tiles by layer:
- "Show me MODIS true colour today"
- "Global cloud cover this morning"
- "GIBS satellite imagery for Europe"
- "Aerosol optical depth layer"

GIBS exposes hundreds of layers (atmosphere, land, ocean, cryosphere). The recipe presents a curated bouquet so the user understands what each band shows.

## How to use

```js
const date = '2026-04-28';
const layers = [
  { id: 'MODIS_Terra_CorrectedReflectance_TrueColor', label: 'True colour (MODIS Terra)' },
  { id: 'MODIS_Aqua_Aerosol',                          label: 'Aerosol optical depth' },
  { id: 'MODIS_Terra_NDSI_Snow_Cover',                 label: 'Snow cover' },
  { id: 'VIIRS_SNPP_Thermal_Anomalies_375m_Day',       label: 'Active fires' }
];

// 1. Fetch tile metadata for each layer
const responses = await Promise.all(
  layers.map(l => call('nasa_gibs', { layer: l.id, date, format: 'png', resolution: 250 }).catch(() => null))
);

// 2. Multi-layer map (toggleable layers)
// Debug: inspect response shape to confirm the tile URL key
if (responses[0]) console.log('nasa_gibs response keys:', JSON.stringify(responses[0]));
const tileLayers = responses.map((r, i) => ({
  name: layers[i]?.label ?? '—',
  url: r?.tile_url || r?.tileUrl || r?.wmsUrl || r?.url,
  opacity: i === 0 ? 1 : 0.6
})).filter(t => t.url);

if (tileLayers.length === 0) {
  // Fallback: show raw response so the correct key is visible
  await widget('kv', {
    items: [{ label: 'Debug — raw response[0]', value: JSON.stringify(responses[0]) }]
  });
} else {
  await widget('map', {
    center: [20, 0],
    zoom: 2,
    tileLayers
  });
}

// 3. Cards describing each layer
await widget('cards', {
  items: layers.map(l => ({
    title: l.label,
    subtitle: l.id,
    description: l.id.includes('MODIS') ? 'Daily revisit, 250m-1km resolution' : 'Daily revisit, 375m-750m resolution'
  }))
});

// 4. Technical metadata
await widget('kv', {
  items: [
    { label: 'Date', value: date },
    { label: 'Format', value: 'png' },
    { label: 'Resolution', value: '250 px/deg' },
    { label: 'Layers loaded', value: layers.length }
  ]
});
```

## Examples

### Daily true colour
```js
const r = await call('nasa_gibs', { layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2026-04-28' }).catch(() => null);
// Always show metadata first — independent of tile URL availability
await widget('kv', { items: [{ label: 'Layer', value: 'MODIS Terra TrueColor' }, { label: 'Date', value: '2026-04-28' }] });
const url = r?.tile_url || r?.tileUrl || r?.wmsUrl || r?.url;
if (url) {
  await widget('map', { center: [0, 0], zoom: 2, tileLayers: [{ name: 'True colour', url }] });
} else {
  await widget('kv', { items: [{ label: 'Debug — raw response', value: JSON.stringify(r) }] });
}
```

### Fires + aerosols overlay
```js
const fires = await call('nasa_gibs', { layer: 'VIIRS_SNPP_Thermal_Anomalies_375m_Day', date: '2026-04-28' }).catch(() => null);
const aero  = await call('nasa_gibs', { layer: 'MODIS_Aqua_Aerosol',                    date: '2026-04-28' }).catch(() => null);
const getUrl = r => r?.tile_url || r?.tileUrl || r?.wmsUrl || r?.url;
const tileLayers = [
  getUrl(aero)  ? { name: 'Aerosol', url: getUrl(aero),  opacity: 0.5 } : null,
  getUrl(fires) ? { name: 'Fires',   url: getUrl(fires), opacity: 1.0 } : null
].filter(Boolean);
if (tileLayers.length === 0) {
  await widget('kv', { items: [
    { label: 'Debug — fires response',  value: JSON.stringify(fires) },
    { label: 'Debug — aerosol response', value: JSON.stringify(aero) }
  ]});
} else {
  await widget('map', { center: [-5, 25], zoom: 4, tileLayers });
}
```

## Common mistakes

- Using a layer name with wrong casing — GIBS IDs are exact (`MODIS_Terra_CorrectedReflectance_TrueColor`)
- Stacking opaque layers — set opacity below 0.7 for overlays so the base remains visible
- Forgetting the date — GIBS only renders the date you ask for, defaults to "today" but tiles may not be processed yet
- Mixing different time scales (daily vs orbit) without explaining — cards must mention temporal resolution
- Skipping the resolution — at zoom 2 you waste time fetching 250 px/deg tiles, use 1 or 2 px/deg at low zoom
