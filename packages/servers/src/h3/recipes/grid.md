---
widget: h3-grid
description: Hexagonal grid (H3) around a center point at a given resolution
group: h3
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number, description: Center latitude }
    lng: { type: number, description: Center longitude }
    resolution: { type: number, description: "H3 resolution 0-15 (default 8, ~1km hex edge)" }
    k: { type: number, description: "Disk radius in hexagons (default 4)" }
    style: { type: string, description: "Basemap: voyager (default), dark, positron" }
    color: { type: string, description: "Hex fill color (default '#3388ff')" }
    opacity: { type: number, description: "Fill opacity 0..1 (default 0.35)" }
---

## When to use
Visualize an H3 hexagonal grid covering a region. Useful as a base for spatial aggregation, gridded analysis, or coverage display.

## Example
```
h3_webmcp_widget_display({name: "h3-grid", params: { lat: 48.8566, lng: 2.3522, resolution: 9, k: 6 }})
```
