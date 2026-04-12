---
widget: hillshade-map
description: Relief shading layer showing terrain without 3D extrusion
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Map center [lng, lat] (default Swiss Alps)
    zoom:
      type: number
      description: Initial zoom level (default 10)
    exaggeration:
      type: number
      description: Hillshade exaggeration (default 0.5)
    shadowColor:
      type: string
      description: Shadow color (default "#473B24")
    highlightColor:
      type: string
      description: Highlight color (default "#fff")
    accentColor:
      type: string
      description: Accent color (default "#000")
    illuminationDirection:
      type: number
      description: Light direction in degrees (default 315)
    style:
      type: string
      description: Map style URL
---

## Usage

Add a hillshade relief layer to the map. Shows terrain through shading without 3D perspective — useful for topographic visualization in 2D.

## Example

```json
{
  "center": [7.36, 46.49],
  "zoom": 10,
  "exaggeration": 0.7,
  "illuminationDirection": 315
}
```
