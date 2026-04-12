---
widget: wind-particle-map
description: Animated particle flow simulation for wind or current visualization
group: mapbox
schema:
  type: object
  properties:
    windData:
      type: array
      description: Array of wind vector objects with coordinates, u, v
    particles:
      type: array
      description: Alias for windData
    particleCount:
      type: number
      description: Number of particles (default 200)
    particleColor:
      type: string
      description: Particle color (default "#64b5f6")
    speed:
      type: number
      description: Animation speed multiplier (default 0.003)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
    style:
      type: string
      description: Map style URL (default dark)
---

## Usage

Visualize wind or ocean current patterns with animated particles flowing across the map. The particle motion is derived from a flow field.

## How
1. Call `mapbox_webmcp_widget_display({name: "wind-particle-map", params: {center: [2.35, 48.85], zoom: 6, particleCount: 300, particleColor: "#64b5f6", speed: 0.004}})`

## Example

```json
{
  "center": [2.35, 48.85],
  "zoom": 6,
  "particleCount": 300,
  "particleColor": "#64b5f6",
  "speed": 0.004
}
```
