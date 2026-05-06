---
widget: openlayers-projection
description: Map with custom projection (EPSG:4326 lat/lon or EPSG:3857 Web Mercator).
group: openlayers
schema:
  type: object
  properties:
    projection: { type: string, description: "'EPSG:3857' (default OSM) or 'EPSG:4326' (lat/lon)" }
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

## When to use
Show a non-Mercator view (e.g. EPSG:4326 plate carrée).

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-projection", params: {
  projection: "EPSG:4326", center: { lat: 0, lon: 0 }, zoom: 2
}})
```
