---
widget: kepler-points
description: Geo points on an interactive Kepler.gl map with optional value-based color.
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows:
      type: array
      description: "[{lat, lng, value?, label?}]"
    radius: { type: number, description: "Marker radius (default 8)" }
    opacity: { type: number, description: "0–1 (default 0.8)" }
---

## When to use
Plot a list of geographic points. Color/size scales auto-apply when a `value` column is present.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-points", params: { rows: [{lat: 48.85, lng: 2.35, value: 10}, {lat: 51.5, lng: -0.1, value: 25}] } })
```
