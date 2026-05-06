---
widget: openlayers-xyz
description: Tiled raster basemap from a custom XYZ URL template (Mapbox, Stamen, Carto, etc.).
group: openlayers
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "Tile URL template with {z}/{x}/{y}" }
    attributions: { type: string }
    maxZoom: { type: number }
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

## When to use
Use a non-OSM tile provider via XYZ template.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-xyz", params: {
  url: "https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  center: { lat: 48.85, lon: 2.35 }, zoom: 6
}})
```
