---
widget: harp-mercator
description: Flat mercator projection (no tilt) — classic 2D web map look.
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    center: { type: array }
    zoom: { type: number, description: Default 10 }
    apiKey: { type: string }
---

## When to use
Mercator projection without 3D tilt — closest to a Google/OSM look.

## Example
```
harp_webmcp_widget_display({name: "harp-mercator", params: { center: [-74.01, 40.71], zoom: 11 }})
```
