---
widget: h3-bbox-fill
description: Fill an axis-aligned bounding box with H3 hexagons
group: h3
schema:
  type: object
  required: [bbox]
  properties:
    bbox:
      type: array
      description: "[west, south, east, north]"
      items: { type: number }
    resolution: { type: number, description: "H3 resolution (default 7)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
    color: { type: string, description: "Hex fill color (default '#9467bd')" }
    opacity: { type: number, description: "Fill opacity (default 0.45)" }
---

## When to use
Quick way to enumerate H3 cells inside a rectangular AOI without building a polygon yourself.

## Example
```
h3_webmcp_widget_display({name: "h3-bbox-fill", params: { bbox: [-122.5, 37.7, -122.35, 37.82], resolution: 8 }})
```
