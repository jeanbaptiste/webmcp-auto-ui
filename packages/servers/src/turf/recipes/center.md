---
widget: turf-center
description: Geographic center (bbox center) of a Feature or FeatureCollection.
group: turf
schema:
  type: object
  required: [geojson]
  properties:
    geojson: { type: object, description: "Any Feature or FeatureCollection" }
---

## When to use
Quick visual center of a dataset for camera positioning.

## Example
```
turf_webmcp_widget_display({name: "turf-center", params: {geojson: {...}}})
```
