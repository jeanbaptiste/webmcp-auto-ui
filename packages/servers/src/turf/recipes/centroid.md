---
widget: turf-centroid
description: Centroid (mean of all vertices) of a Feature or FeatureCollection.
group: turf
schema:
  type: object
  required: [geojson]
  properties:
    geojson: { type: object, description: "Any Feature or FeatureCollection" }
---

## When to use
Mean-vertex centroid (cheap, robust for point clusters).

## Example
```
turf_webmcp_widget_display({name: "turf-centroid", params: {geojson: {...}}})
```
