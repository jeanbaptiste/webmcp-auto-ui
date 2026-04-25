---
widget: turf-envelope
description: Compute the smallest enveloping rectangle of any GeoJSON.
group: turf
schema:
  type: object
  required: [geojson]
  properties:
    geojson: { type: object, description: "Any Feature, FeatureCollection, or geometry" }
---

## When to use
Get a polygon enveloping all features (similar to bbox-polygon, but always returns a Feature polygon).

## Example
```
turf_webmcp_widget_display({name: "turf-envelope", params: {geojson: {...}}})
```
