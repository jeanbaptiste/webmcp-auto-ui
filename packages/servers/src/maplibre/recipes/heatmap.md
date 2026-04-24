---
widget: maplibre-heatmap
description: Density heatmap of weighted points using MapLibre's native heatmap layer
group: maplibre
schema:
  type: object
  required: [points]
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
    style: { type: string, description: "Default 'dark' for contrast" }
    points:
      type: array
      items:
        type: object
        required: [lng, lat]
        properties:
          lng: { type: number }
          lat: { type: number }
          weight: { type: number, description: "Relative intensity (default 1)" }
    radius: { type: number, description: "Pixel radius per point (default 20)" }
    intensity: { type: number, description: "Global multiplier (default 1)" }
---

## When to use
Show concentration / hotspots of events (crimes, clicks, sightings).

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-heatmap", params: { zoom: 11, radius: 25, points: [{lng:2.35,lat:48.85,weight:3},{lng:2.36,lat:48.86,weight:1}] }})
```
