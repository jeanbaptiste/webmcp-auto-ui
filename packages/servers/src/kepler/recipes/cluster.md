---
widget: kepler-cluster
description: Dynamic point clustering — bubbles regroup as the user zooms.
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: "[{lat, lng, value?}]" }
    clusterRadius: { type: number, description: "Pixel cluster radius (default 40)" }
---

## When to use
Display many points without overplotting. Counts/values aggregate at low zoom.

## Example
```
kepler_webmcp_widget_display({ name: "kepler-cluster", params: { rows: [...] } })
```
