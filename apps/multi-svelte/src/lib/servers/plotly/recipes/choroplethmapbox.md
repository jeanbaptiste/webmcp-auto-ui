---
widget: plotly-choroplethmapbox
description: Choropleth on a Mapbox tile map with custom GeoJSON.
group: plotly
schema:
  type: object
  required: [geojson, locations, z]
  properties:
    title: { type: string, description: Chart title }
    geojson: { type: object, description: GeoJSON FeatureCollection }
    locations: { type: array, items: { type: string }, description: Feature IDs }
    z: { type: array, items: { type: number }, description: Values per feature }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    featureidkey: { type: string, description: "GeoJSON key (default 'properties.id')" }
    zoom: { type: number, description: Map zoom (default 3) }
    center: { type: object, properties: { lat: { type: number }, lon: { type: number } } }
---

## When to use
Color GeoJSON regions on a Mapbox map (uses carto-darkmatter free tiles).

## Example
```
widget_display('plotly-choroplethmapbox', { geojson: {...}, locations: ['01','02'], z: [50, 80], zoom: 5 })
```
