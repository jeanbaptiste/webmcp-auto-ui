---
widget: protomaps-water
description: Render only oceans, lakes and rivers from .pmtiles — water mask for hydrology or coastline studies.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string }
    center: { type: array }
    zoom: { type: number }
    waterColor: { type: string }
    landColor: { type: string }
---

## When to use
Coastline emphasis, hydrology, sea-level visualization, minimalist worldmap.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-water", params: { center: [0, 20], zoom: 2 }})
```
