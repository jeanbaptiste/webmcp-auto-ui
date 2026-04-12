---
widget: plotly-scattermapbox
description: Scatter points on a Mapbox-style tile map.
group: plotly
schema:
  type: object
  required: [lat, lon]
  properties:
    title: { type: string, description: Chart title }
    lat: { type: array, items: { type: number }, description: Latitude values }
    lon: { type: array, items: { type: number }, description: Longitude values }
    text: { type: array, items: { type: string }, description: Hover text }
    mode: { type: string, description: "'markers' (default)" }
    markerSize: { type: number, description: Marker size (default 8) }
    color: { type: array, description: Marker colors }
    zoom: { type: number, description: Initial zoom (default 3) }
    center: { type: object, properties: { lat: { type: number }, lon: { type: number } }, description: Map center }
---

## When to use
Plot points on a Mapbox tile map (uses carto-darkmatter free tiles).

## Example
```
widget_display('plotly-scattermapbox', { lat: [48.85, 40.71], lon: [2.35, -74.01], text: ['Paris','NYC'], zoom: 2 })
```
