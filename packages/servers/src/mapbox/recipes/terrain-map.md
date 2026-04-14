---
widget: terrain-map
description: 3D terrain map with DEM elevation and hillshade
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Map center [lng, lat] (default Mont Blanc area)
    zoom:
      type: number
      description: Initial zoom level (default 12)
    pitch:
      type: number
      description: Map pitch (default 60)
    exaggeration:
      type: number
      description: Terrain height exaggeration (default 1.5)
    style:
      type: string
      description: Map style URL (default outdoors)
---

## Usage

Display a 3D terrain map using Mapbox DEM tiles. The terrain is rendered with actual elevation data and hillshade for depth perception. Ideal for mountainous areas.

## How
1. Call `mapbox_webmcp_widget_display({name: "terrain-map", params: {center: [6.8652, 45.8326], zoom: 12, pitch: 65, exaggeration: 2.0}})`

## Example

```json
{
  "center": [6.8652, 45.8326],
  "zoom": 12,
  "pitch": 65,
  "exaggeration": 2.0
}
```
