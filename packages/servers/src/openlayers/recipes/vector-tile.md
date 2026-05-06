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
openlayers_webmcp_widget_display({name: "openlayers-vector-tile", params: {
  url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/tile/{z}/{y}/{x}.pbf",
  zoom: 4
}})
```
