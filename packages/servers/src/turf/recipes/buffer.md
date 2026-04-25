---
widget: turf-buffer
description: Compute a buffer (offset) around a point/line/polygon and visualize input + buffer on a map.
group: turf
schema:
  type: object
  required: [feature, distance]
  properties:
    feature: { type: object, description: "GeoJSON Feature or geometry (point/line/polygon) to buffer" }
    distance: { type: number, description: "Buffer radius (positive = outward, negative = inward for polygons)" }
    units: { type: string, description: "'kilometers' (default), 'miles', 'meters', 'degrees'" }
---

## When to use
Visualize spatial proximity zones — service areas, no-fly perimeters, distance bands.

## Example
```
turf_webmcp_widget_display({name: "turf-buffer", params: {distance: 50, units: "kilometers", feature: {type: "Feature", properties: {}, geometry: {type: "Point", coordinates: [2.35, 48.85]}}}})
```
