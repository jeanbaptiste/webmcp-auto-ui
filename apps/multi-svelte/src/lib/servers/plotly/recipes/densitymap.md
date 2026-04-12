---
widget: plotly-densitymap
description: Density heatmap on a tile map.
group: plotly
schema:
  type: object
  required: [lat, lon]
  properties:
    title: { type: string, description: Chart title }
    lat: { type: array, items: { type: number }, description: Latitude values }
    lon: { type: array, items: { type: number }, description: Longitude values }
    z: { type: array, items: { type: number }, description: Intensity weights per point }
    radius: { type: number, description: Heatmap radius in px (default 10) }
    colorscale: { type: string, description: "Colorscale (default 'Hot')" }
    zoom: { type: number, description: Map zoom (default 3) }
    center: { type: object, properties: { lat: { type: number }, lon: { type: number } } }
---

## When to use
Visualize geographic density (earthquakes, crime, population density).

## Example
```
widget_display('plotly-densitymap', { lat: [48.85,48.86,48.84], lon: [2.35,2.36,2.34], radius: 15, zoom: 11 })
```
