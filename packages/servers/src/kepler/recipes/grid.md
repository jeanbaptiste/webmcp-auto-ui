---
widget: kepler-grid
description: Square-grid aggregation of points, optionally extruded in 3D.
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: "[{lat, lng, value?}]" }
    worldUnitSize: { type: number, description: "Cell size in km (default 1)" }
    enable3d: { type: boolean, description: "Extrude cells by value (default true)" }
---

## When to use
Same role as hexbin but with a regular square grid. Useful for aligning to admin grids.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-grid", params: { rows: [...] } })
```
