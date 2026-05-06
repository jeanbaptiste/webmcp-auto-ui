---
widget: openlayers-heatmap
description: Density heatmap of weighted points (HeatmapLayer).
group: openlayers
schema:
  type: object
  required: [points]
  properties:
    points:
      type: array
      description: "[[lon, lat], ...] or [{lon, lat, weight}, ...]"
    radius: { type: number, description: "Point radius in px (default 8)" }
    blur: { type: number, description: "Blur radius (default 15)" }
    weightField: { type: string, description: "Property name on each point used as weight" }
    center:
      description: "Map center. Use object form { lat, lon } to avoid lat/lon swap. Array form [lon, lat] also accepted (note: longitude FIRST, latitude second)."
      oneOf:
        - type: array
          items: { type: number }
          minItems: 2
          maxItems: 2
        - type: object
          required: [lat, lon]
          properties:
            lat: { type: number, minimum: -90, maximum: 90 }
            lon: { type: number, minimum: -180, maximum: 180 }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-heatmap", params: {
  points: [{lon:2.35,lat:48.85,weight:1},{lon:2.36,lat:48.86,weight:0.7}],
  radius: 12, blur: 20, center: { lat: 48.85, lon: 2.35 }, zoom: 12
}})
```
