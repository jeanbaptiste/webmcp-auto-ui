---
widget: leaflet-marker-cluster
description: Display clustered markers that group at lower zoom levels
group: markers
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    markers:
      type: array
      items:
        type: object
        properties:
          latlng:
            type: array
            items: { type: number }
          popup:
            type: string
      description: "Array of markers to cluster"
---

## Marker Cluster

Groups nearby markers into clusters that expand on click/zoom. Uses leaflet.markercluster plugin. Ideal for large datasets (100+ points).

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-marker-cluster", params: {center: [48.85, 2.35], zoom: 5, markers: [{latlng: [48.856, 2.352], popup: "Paris"}, {latlng: [51.505, -0.09], popup: "London"}]}})`

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 5,
  "markers": [
    { "latlng": [48.856, 2.352], "popup": "Point A" },
    { "latlng": [48.857, 2.354], "popup": "Point B" },
    { "latlng": [51.505, -0.09], "popup": "London" },
    { "latlng": [52.52, 13.405], "popup": "Berlin" }
  ]
}
```
