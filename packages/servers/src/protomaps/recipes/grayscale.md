---
widget: protomaps-grayscale
description: Protomaps basemap rendered in grayscale — minimal hue, perfect for data overlays.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string }
    center: { type: array }
    zoom: { type: number }
---

## When to use
Use as background for choropleth, heatmap, or any overlay that needs maximum visual prominence.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-grayscale", params: { center: [10, 50], zoom: 4 }})
```
