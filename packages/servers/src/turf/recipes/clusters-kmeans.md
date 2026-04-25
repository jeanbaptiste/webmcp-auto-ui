---
widget: turf-clusters-kmeans
description: K-means clustering of points (color-coded clusters).
group: turf
schema:
  type: object
  required: [points]
  properties:
    points: { type: object, description: "FeatureCollection of points" }
    numberOfClusters: { type: number, description: "Number of clusters K (default 4)" }
---

## When to use
Group points into K clusters by proximity (territory partitioning, segmentation).

## Example
```
turf_webmcp_widget_display({name: "turf-clusters-kmeans", params: {points: {...}, numberOfClusters: 5}})
```
