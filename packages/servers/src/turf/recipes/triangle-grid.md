---
widget: turf-triangle-grid
description: Triangle grid covering a bbox.
group: turf
schema:
  type: object
  required: [bbox, cellSide]
  properties:
    bbox: { type: array, items: { type: number } }
    cellSide: { type: number }
    units: { type: string, description: "'kilometers' (default)" }
---

## When to use
Triangular tessellation for specialized binning or rendering.

## Example
```
turf_webmcp_widget_display({name: "turf-triangle-grid", params: {bbox: [-5, 40, 10, 52], cellSide: 100}})
```
