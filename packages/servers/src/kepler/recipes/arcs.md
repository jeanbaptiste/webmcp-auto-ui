---
widget: kepler-arcs
description: Arcs between origin/destination coordinate pairs (flows, migrations, OD matrices).
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows:
      type: array
      description: "[{lat0, lng0, lat1, lng1, value?}]"
    thickness: { type: number, description: "Arc thickness (default 2)" }
---

## When to use
Show directional flow between two points (migrations, trade flows, OD pairs).

## Example
```
kepler_webmcp_widget_display({ name: "kepler-arcs", params: { rows: [{lat0: 48.85, lng0: 2.35, lat1: 40.7, lng1: -74, value: 100}] } })
```
