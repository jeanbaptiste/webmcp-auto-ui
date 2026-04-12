---
widget: plotly-choroplethmap
description: Choropleth on a tile map with custom GeoJSON.
group: plotly
schema:
  type: object
  required: [geojson, locations, z]
  properties:
    title: { type: string, description: Chart title }
    geojson: { type: object, description: GeoJSON FeatureCollection }
    locations: { type: array, items: { type: string }, description: Feature IDs matching geojson }
    z: { type: array, items: { type: number }, description: Values per feature }
    colorscale: { type: string, description: "Colorscale (default 'Viridis')" }
    featureidkey: { type: string, description: "GeoJSON property for matching (default 'properties.id')" }
    zoom: { type: number, description: Map zoom (default 3) }
    center: { type: object, properties: { lat: { type: number }, lon: { type: number } } }
---

## When to use
Color regions on a tile map using custom GeoJSON boundaries.

## Example
```
plotly_webmcp_widget_display({name: "plotly-choroplethmap", params: { geojson: {...}, locations: ['01','02'], z: [100, 200], zoom: 5 }})
```
