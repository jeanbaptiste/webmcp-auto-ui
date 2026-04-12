---
widget: plotly-scattermap
description: Scatter points on a tile-based map (new Plotly map API).
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
    zoom: { type: number, description: Initial zoom level (default 3) }
    center: { type: object, properties: { lat: { type: number }, lon: { type: number } }, description: Map center }
---

## When to use
Plot points on an interactive tile map (OpenStreetMap-style).

## Example
```
plotly_webmcp_widget_display({name: "plotly-scattermap", params: { lat: [48.85, 45.76], lon: [2.35, 4.83], text: ['Paris','Lyon'], zoom: 5 }})
```
