---
widget: cluster-map
description: Clustered point markers that expand on zoom
group: mapbox
schema:
  type: object
  properties:
    points:
      type: array
      description: Array of point objects with coordinates and optional label
    clusterMaxZoom:
      type: number
      description: Maximum zoom level for clustering (default 14)
    clusterRadius:
      type: number
      description: Cluster radius in pixels (default 50)
    colorSmall:
      type: string
      description: Color for small clusters (default "#51bbd6")
    colorMedium:
      type: string
      description: Color for medium clusters (default "#f1f075")
    colorLarge:
      type: string
      description: Color for large clusters (default "#f28cb1")
    pointColor:
      type: string
      description: Unclustered point color (default "#6366f1")
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Display many points with automatic clustering. Clusters show point count and expand on click. Individual points appear at higher zoom levels.

## How
1. Call `mapbox_webmcp_widget_display({name: "cluster-map", params: {points: [{coordinates: [2.35, 48.85], label: "Point 1"}, {coordinates: [2.36, 48.86], label: "Point 2"}], clusterRadius: 40, center: [2.35, 48.85], zoom: 10}})`

## Example

```json
{
  "points": [
    {"coordinates": [2.35, 48.85], "label": "Point 1"},
    {"coordinates": [2.36, 48.86], "label": "Point 2"},
    {"coordinates": [2.34, 48.84], "label": "Point 3"},
    {"coordinates": [2.37, 48.87], "label": "Point 4"}
  ],
  "clusterRadius": 40,
  "center": [2.35, 48.85],
  "zoom": 10
}
```
