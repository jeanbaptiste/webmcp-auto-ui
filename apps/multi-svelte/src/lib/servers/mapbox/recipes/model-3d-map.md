---
widget: model-3d-map
description: Place a 3D model representation (extruded footprint) on the map
group: mapbox
schema:
  type: object
  properties:
    center:
      type: array
      description: Map center [lng, lat]
    modelCenter:
      type: array
      description: Model placement coordinates [lng, lat]
    modelSize:
      type: number
      description: Model footprint size in degrees (default 0.001)
    modelHeight:
      type: number
      description: Model extrusion height in meters (default 100)
    modelColor:
      type: string
      description: Model color (default "#6366f1")
    label:
      type: string
      description: Optional label shown as marker popup
    opacity:
      type: number
      description: Model opacity (default 0.85)
    pitch:
      type: number
      description: Map pitch (default 60)
    zoom:
      type: number
      description: Initial zoom level (default 16)
    style:
      type: string
      description: Map style URL
---

## Usage

Place a 3D extruded shape on the map representing a model or building footprint. Useful for architectural visualization or point-of-interest highlighting.

## Example

```json
{
  "center": [2.2945, 48.8584],
  "modelCenter": [2.2945, 48.8584],
  "modelHeight": 330,
  "modelColor": "#f97316",
  "label": "Eiffel Tower",
  "zoom": 16
}
```
