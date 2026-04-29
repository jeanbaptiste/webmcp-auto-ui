---
widget: openlayers-image-arcgis
description: ArcGIS REST Image Server / MapServer dynamic image layer.
group: openlayers
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "ArcGIS REST endpoint" }
    params: { type: object, description: "Extra ArcGIS export params" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-image-arcgis", params: {
  url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
  center: [-100, 40], zoom: 4
}})
```
