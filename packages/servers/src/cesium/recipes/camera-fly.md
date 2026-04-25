---
widget: cesium-camera-fly
description: Animate the camera flying to a longitude/latitude/height with orientation.
group: cesium
schema:
  type: object
  properties:
    longitude: { type: number }
    latitude: { type: number }
    height: { type: number, description: Camera height in meters }
    heading: { type: number, description: Heading degrees (default 0) }
    pitch: { type: number, description: Pitch degrees (default -45) }
    duration: { type: number, description: Flight duration in seconds (default 3) }
---

## When to use
Cinematic camera moves: zoom into a city, sweep over a route, dramatic intro.

## Example
```
cesium_webmcp_widget_display({name: "cesium-camera-fly", params: { longitude: 2.35, latitude: 48.85, height: 50000, pitch: -30, duration: 4 }})
```
