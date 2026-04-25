---
widget: kepler-hexbin
description: Hexagonal aggregation of points (count or weighted by value), with optional 3D extrusion.
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows:
      type: array
      description: "[{lat, lng, value?}]"
    worldUnitSize: { type: number, description: "Hex cell size in km (default 1)" }
    enable3d: { type: boolean, description: "Extrude bins by value (default true)" }
---

## When to use
Aggregate many points into hex cells. 3D extrusion makes counts pop.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-hexbin", params: { rows: [...], worldUnitSize: 2 } })
```
