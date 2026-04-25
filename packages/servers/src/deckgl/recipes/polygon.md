---
widget: deckgl-polygon
description: Filled and stroked polygons. Optionally extruded into 3D prisms.
group: deckgl
schema:
  type: object
  required: [polygons]
  properties:
    polygons: { type: array, description: "Array of {polygon: [[lng,lat], ...], elevation?, fillColor?, lineColor?}" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
    extruded: { type: boolean, description: "Extrude polygons by elevation" }
    wireframe: { type: boolean }
---

## When to use
Custom polygon overlays — districts, parcels, footprints. Use extruded for 3D volumes.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-polygon", params: {
  polygons: [{polygon:[[2.35,48.85],[2.36,48.85],[2.36,48.86],[2.35,48.86]], elevation:200}],
  pitch: 45, extruded: true, zoom: 14
}})
```
