---
widget: fog-map
description: Atmospheric fog and haze effects on the map
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Map center [lng, lat] (default San Francisco)
    zoom:
      type: number
      description: Initial zoom level (default 13)
    pitch:
      type: number
      description: Map pitch (default 60)
    fogColor:
      type: string
      description: Fog color (default white semi-transparent)
    highColor:
      type: string
      description: Upper atmosphere color (default light blue)
    horizonBlend:
      type: number
      description: Horizon blend (default 0.1)
    spaceColor:
      type: string
      description: Sky color
    range:
      type: array
      description: Fog range [start, end] (default [0.5, 10])
    terrain:
      type: boolean
      description: Enable 3D terrain (default true)
    exaggeration:
      type: number
      description: Terrain exaggeration (default 1.2)
    style:
      type: string
      description: Map style URL
---

## Usage

Add atmospheric fog to create depth and mood. Combined with terrain for a cinematic look.

## Example

```json
{
  "center": [-122.4194, 37.7749],
  "zoom": 13,
  "pitch": 60,
  "fogColor": "rgba(220, 230, 240, 0.9)",
  "terrain": true
}
```
