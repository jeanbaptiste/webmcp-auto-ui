---
widget: maplibre-cluster
description: Cluster many points into aggregated circles sized by count (native MapLibre supercluster)
group: maplibre
schema:
  type: object
  required: [points]
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    style: { type: string }
    points:
      type: array
      items:
        type: object
        required: [lng, lat]
        properties:
          lng: { type: number }
          lat: { type: number }
          properties: { type: object }
    clusterRadius: { type: number, description: "Pixel radius to cluster within (default 50)" }
---

## When to use
Thousands of markers would be unreadable — cluster them dynamically.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-cluster", params: { zoom: 2, points: [{lng:2.35,lat:48.85},{lng:2.36,lat:48.86},{lng:-0.13,lat:51.51},{lng:13.40,lat:52.52}] }})
```
