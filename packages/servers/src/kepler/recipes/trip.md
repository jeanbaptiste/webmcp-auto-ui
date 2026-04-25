---
widget: kepler-trip
description: Animated time-stamped trajectories (vehicle GPS, migrations).
group: kepler
schema:
  type: object
  properties:
    title: { type: string }
    geojson: { type: object, description: "FeatureCollection with [lng, lat, alt, ts] coords (recommended)" }
    rows: { type: array, description: "[{trip_id, lat, lng, ts}] alternative shape" }
    trailLength: { type: number, description: "Visible trail length in seconds (default 180)" }
    speed: { type: number, description: "Animation speed multiplier (default 1)" }
---

## When to use
Animate moving objects over time (taxis, deliveries, animal tracks).

## Example
```
kepler_webmcp_widget_display({ name: "kepler-trip", params: { geojson: tripFeatureCollection } })
```
