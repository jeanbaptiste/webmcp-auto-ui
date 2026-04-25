---
widget: cesium-line
description: Polyline georeferenced on the globe (flight path, route, transect).
group: cesium
schema:
  type: object
  required: [path]
  properties:
    path: { type: array, description: "[[longitude, latitude, height?], ...] (>=2 points)" }
    color: { type: string, description: CSS color }
    width: { type: number, description: Stroke width in pixels (default 3) }
    clampToGround: { type: boolean, description: Drape on terrain (default false) }
---

## When to use
Flight tracks, hiking trails, shipping routes, fiber-optic cables.

## Example
```
cesium_webmcp_widget_display({name: "cesium-line", params: { path: [[-74,40.7,9000],[-9,38.7,9500],[2.35,48.85,9000]], color: "#f97316", width: 4 }})
```
