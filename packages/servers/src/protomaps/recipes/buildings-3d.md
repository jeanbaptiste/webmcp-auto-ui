---
widget: protomaps-buildings-3d
description: 3D extruded buildings from .pmtiles — uses fill-extrusion with a height property.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string, description: "HTTPS URL to a .pmtiles with a 'buildings' source-layer including a numeric 'height'" }
    center: { type: array }
    zoom: { type: number, description: "Recommended >= 14 to see extrusions" }
    pitch: { type: number, description: "Camera pitch in degrees (default 60)" }
    bearing: { type: number, description: "Camera bearing in degrees" }
    heightProp: { type: string, description: "Property name carrying building height (default 'height')" }
    color: { type: string, description: "Extrusion color" }
    opacity: { type: number, description: "0..1" }
---

## When to use
3D urban visualization, real-estate dashboards, architectural studies.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-buildings-3d", params: {
  center: [-74.006, 40.7128], zoom: 16, pitch: 60, bearing: -20
}})
```
