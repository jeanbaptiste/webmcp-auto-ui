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
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-wms", params: {
  url: "https://ahocevar.com/geoserver/wms",
  layers: "topp:states",
  center: [-100, 40], zoom: 4
}})
```
