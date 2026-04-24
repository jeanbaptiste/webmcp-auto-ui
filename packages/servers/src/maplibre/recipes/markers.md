---
widget: maplibre-markers
description: Drop colored markers with optional HTML popups on a MapLibre map
group: maplibre
schema:
  type: object
  required: [markers]
  properties:
    center:
      type: array
      items: { type: number }
      description: "[lng, lat] — defaults to first marker"
    zoom: { type: number }
    style: { type: string }
    markers:
      type: array
      items:
        type: object
        required: [lng, lat]
        properties:
          lng: { type: number }
          lat: { type: number }
          color: { type: string, description: "CSS color" }
          popup: { type: string, description: "HTML shown on click" }
---

## When to use
Point-of-interest display with optional popups.

## Example
```
maplibre_webmcp_widget_display({name: "maplibre-markers", params: { zoom: 12, markers: [{lng: 2.3522, lat: 48.8566, color: "#e74c3c", popup: "<b>Paris</b>"}, {lng: 2.2945, lat: 48.8584, popup: "Eiffel Tower"}] }})
```
