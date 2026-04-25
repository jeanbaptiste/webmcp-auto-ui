---
widget: turf-bbox-polygon
description: Compute the bounding box of any GeoJSON and draw it as an enveloping rectangle.
group: turf
schema:
  type: object
  required: [geojson]
  properties:
    geojson: { type: object, description: "Any Feature, FeatureCollection, or geometry" }
---

## When to use
Quickly visualize the spatial extent of a dataset.

## Example
```
turf_webmcp_widget_display({name: "turf-bbox-polygon", params: {geojson: {...featureCollection}}})
```
