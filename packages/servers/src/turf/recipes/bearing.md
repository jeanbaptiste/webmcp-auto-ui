---
widget: turf-bearing
description: Compass bearing from point A to point B (label on map).
group: turf
schema:
  type: object
  required: [a, b]
  properties:
    a: { type: object, description: "Origin point" }
    b: { type: object, description: "Destination point" }
---

## When to use
Direction in degrees between two coordinates (navigation, routing).

## Example
```
turf_webmcp_widget_display({name: "turf-bearing", params: {a: [2.35, 48.85], b: [13.4, 52.5]}})
```
