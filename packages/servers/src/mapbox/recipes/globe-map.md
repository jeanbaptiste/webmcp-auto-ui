---
widget: globe-map
description: Globe projection with atmosphere, fog, and optional auto-rotation
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Initial center [lng, lat] (default [0, 20])
    zoom:
      type: number
      description: Initial zoom level (default 1.5)
    rotate:
      type: boolean
      description: Enable auto-rotation (default true)
    markers:
      type: array
      description: Array of marker objects with coordinates, optional color and label
    fogColor:
      type: string
      description: Atmosphere fog color
    fogHighColor:
      type: string
      description: Upper atmosphere color
    spaceColor:
      type: string
      description: Space background color
    starIntensity:
      type: number
      description: Star visibility intensity (default 0.6)
    horizonBlend:
      type: number
      description: Horizon blend factor (default 0.02)
    style:
      type: string
      description: Map style URL (default satellite)
---

## Usage

Display an interactive globe with atmosphere effects. Markers can be placed anywhere on Earth. The globe auto-rotates by default and stops on interaction.

## How
1. Call `mapbox_webmcp_widget_display({name: "globe-map", params: {markers: [{coordinates: [2.35, 48.85], label: "Paris", color: "#ef4444"}, {coordinates: [-73.98, 40.74], label: "New York"}], starIntensity: 0.8}})`

## Example

```json
{
  "markers": [
    {"coordinates": [2.35, 48.85], "label": "Paris", "color": "#ef4444"},
    {"coordinates": [-73.98, 40.74], "label": "New York"},
    {"coordinates": [139.69, 35.68], "label": "Tokyo"}
  ],
  "starIntensity": 0.8
}
```
