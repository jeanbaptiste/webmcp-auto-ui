---
widget: s2-region-coverer
description: Visualize RegionCoverer output for a circular cap (lat, lng, radiusKm) with tunable options.
group: s2
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number }
    lng: { type: number }
    radiusKm: { type: number, description: "Cap radius in km (default 50)" }
    minLevel: { type: number, description: "default 0" }
    maxLevel: { type: number, description: "default 30" }
    maxCells: { type: number, description: "default 8" }
    levelMod: { type: number, description: "1 | 2 | 3 (default 1)" }
    style: { type: string }
---

## When to use
Tune RegionCoverer parameters interactively to see the effect on cell count and shape.

## Example
```
s2_webmcp_widget_display({name: "s2-region-coverer", params: { lat: 48.8566, lng: 2.3522, radiusKm: 100, maxCells: 12 }})
```
