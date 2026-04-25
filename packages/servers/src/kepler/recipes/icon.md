---
widget: kepler-icon
description: Points rendered as named icons (places of interest, asset categories).
group: kepler
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: "[{lat, lng, icon}] — icon names from Kepler's icon set" }
    radius: { type: number, description: "Icon radius (default 16)" }
---

## When to use
Differentiate POI categories visually (restaurant/hotel/store).

## Example
```
kepler_webmcp_widget_display({ name: "kepler-icon", params: { rows: [{lat: 48.85, lng: 2.35, icon: "place"}] } })
```
