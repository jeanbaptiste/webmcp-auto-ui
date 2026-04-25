---
widget: h3-edges
description: originToDirectedEdges — show the 6 directed edges of an H3 cell
group: h3
schema:
  type: object
  properties:
    cell: { type: string, description: "H3 index (alternative to lat/lng)" }
    lat: { type: number }
    lng: { type: number }
    resolution: { type: number, description: "H3 resolution when using lat/lng (default 8)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
---

## When to use
Visualize directed-edge structure of an H3 cell — useful when teaching the H3 graph model or debugging edge IDs.

## Example
```
h3_webmcp_widget_display({name: "h3-edges", params: { lat: 48.8566, lng: 2.3522, resolution: 10 }})
```
