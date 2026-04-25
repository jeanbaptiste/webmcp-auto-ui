---
widget: openlayers-wmts
description: OGC WMTS layer configured from a GetCapabilities document.
group: openlayers
schema:
  type: object
  required: [capabilitiesUrl, layer]
  properties:
    capabilitiesUrl: { type: string, description: "WMTS GetCapabilities URL" }
    layer: { type: string, description: "Layer identifier" }
    matrixSet: { type: string, description: "TileMatrixSet (optional)" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-wmts", params: {
  capabilitiesUrl: "https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml",
  layer: "ch.swisstopo.swissimage"
}})
```
