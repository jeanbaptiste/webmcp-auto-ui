---
widget: deckgl-path
description: Polyline paths over a MapLibre basemap. Trajectories, routes, contours.
group: deckgl
schema:
  type: object
  required: [paths]
  properties:
    paths: { type: array, description: "Array of {path: [[lng,lat], ...], color?, width?}" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
    color: { description: "Fallback color" }
---

## When to use
Routes, GPS traces, vehicle paths, polylines.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-path", params: {
  paths: [{path:[[2.35,48.85],[2.30,48.87],[2.34,48.89]], width:6}],
  center: [2.32, 48.87], zoom: 13
}})
```
