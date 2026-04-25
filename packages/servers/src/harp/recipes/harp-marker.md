---
widget: harp-marker
description: HTML pin markers anchored to lat/lon on a Harp.gl map.
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    markers:
      type: array
      description: Pins to display
      items:
        type: object
        required: [lat, lon]
        properties:
          lat: { type: number }
          lon: { type: number }
          label: { type: string }
          color: { type: string, description: CSS color (default #e53935) }
    center: { type: array }
    zoom: { type: number }
    tilt: { type: number, description: Default 30 }
    apiKey: { type: string }
---

## When to use
Show points of interest on a Harp map. Pins are HTML overlays (not 3D meshes).

## Example
```
harp_webmcp_widget_display({name: "harp-marker", params: {
  markers: [
    { lat: 48.86, lon: 2.35, label: "Paris", color: "#e53935" },
    { lat: 51.51, lon: -0.13, label: "London" }
  ],
  zoom: 5
}})
```
