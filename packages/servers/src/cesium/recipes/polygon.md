---
widget: cesium-polygon
description: Filled polygon projected on the globe — optionally extruded to a 3D prism.
group: cesium
schema:
  type: object
  required: [ring]
  properties:
    ring: { type: array, description: "[[longitude, latitude], ...] outer ring (>=3 points)" }
    color: { type: string, description: CSS fill color }
    alpha: { type: number, description: Fill alpha 0..1 (default 0.55) }
    extrudedHeight: { type: number, description: Prism height in meters (default 0 — flat) }
---

## When to use
Country outlines, administrative zones, building footprints (extruded).

## Example
```
cesium_webmcp_widget_display({name: "cesium-polygon", params: { ring: [[2.30,48.85],[2.40,48.85],[2.40,48.88],[2.30,48.88]], color: "#a855f7", extrudedHeight: 200 }})
```
