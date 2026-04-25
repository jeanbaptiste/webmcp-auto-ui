---
widget: h3-ring
description: gridRing(center, k) — ring of hexagons at exact distance k
group: h3
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number }
    lng: { type: number }
    resolution: { type: number, description: "H3 resolution (default 8)" }
    k: { type: number, description: "Exact ring distance (default 3)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
    color: { type: string, description: "Ring fill color (default '#e74c3c')" }
    opacity: { type: number, description: "Fill opacity (default 0.55)" }
---

## When to use
Highlight cells at exactly distance k from a center, e.g. for boundary or annulus analysis.

## Example
```
h3_webmcp_widget_display({name: "h3-ring", params: { lat: 51.5074, lng: -0.1278, resolution: 8, k: 4 }})
```
