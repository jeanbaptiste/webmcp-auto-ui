---
widget: turf-point-grid
description: Regular grid of points covering a bbox.
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
Uniform sampling pattern, grid-based interpolation.

## Example
```
turf_webmcp_widget_display({name: "turf-point-grid", params: {bbox: [-5, 40, 10, 52], cellSide: 100}})
```
