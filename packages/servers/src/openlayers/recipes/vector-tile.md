---
widget: openlayers-vector-tile
description: Mapbox Vector Tile (MVT) layer rendered client-side.
group: openlayers
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "MVT URL template ({z}/{x}/{y}.pbf)" }
    attributions: { type: string }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-vector-tile", params: {
  url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf",
  zoom: 4
}})
```
