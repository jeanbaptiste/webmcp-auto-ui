---
widget: leaflet-feature-group
description: Render a collection of heterogeneous features (markers, circles, polygons, polylines) with auto-fit
group: layers
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    features:
      type: array
      items:
        type: object
        properties:
          type:
            type: string
            description: "marker | circle | polygon | polyline"
          latlng:
            type: array
          latlngs:
            type: array
          radius:
            type: number
          color:
            type: string
          popup:
            type: string
---

## Feature Group

A collection of mixed features (markers, circles, polygons, polylines) displayed together. Map auto-fits to contain all features.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-feature-group", params: {features: [{type: "marker", latlng: [48.856, 2.352], popup: "POI"}, {type: "circle", latlng: [48.858, 2.355], radius: 300, color: "#e74c3c"}]}})`

## Example

```json
{
  "features": [
    { "type": "marker", "latlng": [48.856, 2.352], "popup": "Point of interest" },
    { "type": "circle", "latlng": [48.858, 2.355], "radius": 300, "color": "#e74c3c" },
    { "type": "polyline", "latlngs": [[48.855, 2.350], [48.860, 2.360]], "color": "#2ecc71" }
  ]
}
```
