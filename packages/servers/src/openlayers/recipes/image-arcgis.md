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
openlayers_webmcp_widget_display({name: "openlayers-image-arcgis", params: {
  url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
  center: { lat: 40, lon: -100 }, zoom: 4
}})
```
