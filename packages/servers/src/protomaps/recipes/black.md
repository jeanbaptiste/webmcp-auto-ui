---
widget: protomaps-black
description: Pure black Protomaps basemap — minimal cartography for high-impact overlays.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string }
    center: { type: array }
    zoom: { type: number }
---

## When to use
Pair with vibrant overlays (heatmap, animated paths) where the geography should fade to black.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-black", params: { center: [0, 20], zoom: 2 }})
```
