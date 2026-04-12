---
widget: plotly-densitymapbox
description: Density heatmap on a Mapbox tile map.
group: plotly
schema:
  type: object
  required: [lat, lon]
  properties:
    title: { type: string, description: Chart title }
    lat: { type: array, items: { type: number }, description: Latitude values }
    lon: { type: array, items: { type: number }, description: Longitude values }
    z: { type: array, items: { type: number }, description: Intensity weights }
    radius: { type: number, description: Heatmap radius (default 10) }
    colorscale: { type: string, description: "Colorscale (default 'Hot')" }
    zoom: { type: number, description: Map zoom (default 3) }
    center: { type: object, properties: { lat: { type: number }, lon: { type: number } } }
---

## When to use
Geographic density heatmap on Mapbox tiles (carto-darkmatter).

## Example
```
widget_display('plotly-densitymapbox', { lat: [48.85,48.86,48.84], lon: [2.35,2.36,2.34], radius: 15, zoom: 11 })
```
