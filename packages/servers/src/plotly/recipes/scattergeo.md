---
widget: plotly-scattergeo
description: Scatter points on a geographic map projection.
group: plotly
schema:
  type: object
  required: [lat, lon]
  properties:
    title: { type: string, description: Chart title }
    lat: { type: array, items: { type: number }, description: Latitude values }
    lon: { type: array, items: { type: number }, description: Longitude values }
    text: { type: array, items: { type: string }, description: Hover text per point }
    mode: { type: string, description: "'markers' (default), 'lines', 'lines+markers'" }
    markerSize: { type: number, description: Marker size (default 6) }
    color: { type: array, description: Marker colors }
    projection: { type: string, description: "Map projection (default 'natural earth')" }
---

## When to use
Plot geographic points on a world/regional map (cities, events, stations).

## Example
```
plotly_webmcp_widget_display({name: "plotly-scattergeo", params: { lat: [48.85, 40.71, 35.68], lon: [2.35, -74.01, 139.69], text: ['Paris','NYC','Tokyo'] }})
```
