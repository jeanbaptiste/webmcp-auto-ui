---
widget: openlayers-wms
description: OGC WMS (Web Map Service) tiled layer.
group: openlayers
schema:
  type: object
  required: [url, layers]
  properties:
    url: { type: string, description: "WMS endpoint" }
    layers: { type: string, description: "Comma-separated layer names" }
    transparent: { type: boolean }
    params: { type: object, description: "Extra WMS params" }
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
openlayers_webmcp_widget_display({name: "openlayers-wms", params: {
  url: "https://ahocevar.com/geoserver/wms",
  layers: "topp:states",
  center: { lat: 40, lon: -100 }, zoom: 4
}})
```
