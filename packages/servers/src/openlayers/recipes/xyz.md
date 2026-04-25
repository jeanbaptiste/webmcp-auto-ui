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
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## When to use
Use a non-OSM tile provider via XYZ template.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-xyz", params: {
  url: "https://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  center: [2.35, 48.85], zoom: 6
}})
```
