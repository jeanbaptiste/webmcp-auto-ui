---
widget: building-3d-map
description: 3D buildings layer using Mapbox built-in building data
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Map center [lng, lat] (default NYC [-73.9857, 40.7484])
    zoom:
      type: number
      description: Initial zoom level (default 15)
    pitch:
      type: number
      description: Map pitch (default 60)
    bearing:
      type: number
      description: Map bearing (default -20)
    buildingColor:
      type: string
      description: Building fill color (default "#aaa")
    opacity:
      type: number
      description: Building opacity (default 0.7)
    style:
      type: string
      description: Map style URL
---

## Usage

Display Mapbox's built-in 3D buildings layer. Works best at zoom 14+ in urban areas. Buildings are extruded using their actual height data from OpenStreetMap.

## Example

```json
{
  "center": [-73.9857, 40.7484],
  "zoom": 16,
  "pitch": 60,
  "buildingColor": "#667eea"
}
```
