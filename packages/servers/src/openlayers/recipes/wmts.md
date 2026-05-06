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
openlayers_webmcp_widget_display({name: "openlayers-wmts", params: {
  capabilitiesUrl: "https://wmts.geo.admin.ch/EPSG/3857/1.0.0/WMTSCapabilities.xml",
  layer: "ch.swisstopo.swissimage"
}})
```
