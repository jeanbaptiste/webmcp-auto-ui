---
widget: openlayers-popup
description: Map with clickable point markers that show popup content on click.
group: openlayers
schema:
  type: object
  required: [markers]
  properties:
    markers:
      type: array
      items:
        type: object
        properties:
          lon: { type: number }
          lat: { type: number }
          content: { type: string, description: "HTML or text shown in the popup" }
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
openlayers_webmcp_widget_display({name: "openlayers-popup", params: {
  markers: [
    { lon: 2.3522, lat: 48.8566, content: "<b>Paris</b>" },
    { lon: 2.3376, lat: 48.8606, content: "Louvre" }
  ],
  center: { lat: 48.85, lon: 2.35 }, zoom: 13
}})
```
