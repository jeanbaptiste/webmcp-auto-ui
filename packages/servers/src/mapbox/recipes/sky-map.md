---
widget: sky-map
description: Sky layer with configurable sun position and atmospheric scattering
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Map center [lng, lat] (default Eiffel Tower)
    zoom:
      type: number
      description: Initial zoom level (default 14)
    pitch:
      type: number
      description: Map pitch (default 70)
    skyType:
      type: string
      description: Sky type — "atmosphere" or "gradient" (default "atmosphere")
    sunPosition:
      type: array
      description: Sun azimuth and altitude [azimuth, altitude] (default [0, 75])
    sunIntensity:
      type: number
      description: Sun intensity (default 5)
    atmosphereColor:
      type: string
      description: Atmosphere color
    haloColor:
      type: string
      description: Sun halo color
    exaggeration:
      type: number
      description: Terrain exaggeration (default 1.0)
    style:
      type: string
      description: Map style URL
---

## Usage

Add a realistic sky with sun position and atmospheric scattering. Best combined with terrain for immersive views. Adjust sun position to simulate time of day.

## How
1. Call `mapbox_webmcp_widget_display({name: "sky-map", params: {center: [2.2945, 48.8584], zoom: 14, pitch: 75, sunPosition: [200, 30], sunIntensity: 8}})`

## Example

```json
{
  "center": [2.2945, 48.8584],
  "zoom": 14,
  "pitch": 75,
  "sunPosition": [200, 30],
  "sunIntensity": 8
}
```
