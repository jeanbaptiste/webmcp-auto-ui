---
widget: openlayers-circles
description: Geographic circles (radius in meters) drawn on an OSM basemap.
group: openlayers
schema:
  type: object
  required: [circles]
  properties:
    circles:
      type: array
      items:
        type: object
        properties:
          lon: { type: number }
          lat: { type: number }
          radius: { type: number, description: "Radius in meters" }
          color: { type: string }
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
openlayers_webmcp_widget_display({name: "openlayers-circles", params: {
  circles: [{ lon: 2.35, lat: 48.85, radius: 5000, color: "#e44" }],
  center: { lat: 48.85, lon: 2.35 }, zoom: 11
}})
```
