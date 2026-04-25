---
widget: turf-destination
description: Compute destination point from origin + bearing + distance.
group: turf
schema:
  type: object
  required: [origin, distance, bearing]
  properties:
    origin: { type: object, description: "Origin point ([lng,lat] or Point feature)" }
    distance: { type: number }
    bearing: { type: number, description: "Compass bearing in degrees (0=N, 90=E)" }
    units: { type: string, description: "'kilometers' (default), 'miles', 'meters'" }
---

## When to use
Project a location N km in direction X (impact zone, predicted position).

## Example
```
turf_webmcp_widget_display({name: "turf-destination", params: {origin: [2.35, 48.85], distance: 200, bearing: 45, units: "kilometers"}})
```
