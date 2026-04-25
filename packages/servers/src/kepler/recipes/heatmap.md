---
widget: kepler-heatmap
description: Density heatmap of points, optionally weighted by a value column.
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows:
      type: array
      description: "[{lat, lng, value?}]"
    radius: { type: number, description: "Heat kernel radius (default 20)" }
---

## When to use
Show point density (crime hotspots, customer concentration). Use `value` for weighted heat.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-heatmap", params: { rows: [{lat: 48.85, lng: 2.35, value: 5}, ...] } })
```
