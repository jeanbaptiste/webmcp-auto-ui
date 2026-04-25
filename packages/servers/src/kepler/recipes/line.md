---
widget: kepler-line
description: Straight 2D lines between origin/destination pairs (vs. arcs which curve in 3D).
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: "[{lat0, lng0, lat1, lng1, value?}]" }
    thickness: { type: number, description: "Line thickness (default 2)" }
---

## When to use
Network edges, road segments, OD pairs when arcs feel too noisy.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-line", params: { rows: [{lat0:48.85, lng0:2.35, lat1:51.5, lng1:-0.1}] } })
```
