---
widget: h3-disk
description: gridDisk(center, k) — disk of hexagons at distance ≤ k, colored by ring
group: h3
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number }
    lng: { type: number }
    resolution: { type: number, description: "H3 resolution (default 8)" }
    k: { type: number, description: "Maximum ring distance (default 5)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
    opacity: { type: number, description: "Fill opacity (default 0.6)" }
---

## When to use
Show a "k-neighborhood" of hexagons around a point, with rings colored by graph distance from the center.

## Example
```
h3_webmcp_widget_display({name: "h3-disk", params: { lat: 40.7128, lng: -74.0060, resolution: 9, k: 6 }})
```
