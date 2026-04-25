---
widget: openlayers-projection
description: Map with custom projection (EPSG:4326 lat/lon or EPSG:3857 Web Mercator).
group: openlayers
schema:
  type: object
  properties:
    projection: { type: string, description: "'EPSG:3857' (default OSM) or 'EPSG:4326' (lat/lon)" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## When to use
Show a non-Mercator view (e.g. EPSG:4326 plate carrée).

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-projection", params: {
  projection: "EPSG:4326", center: [0, 0], zoom: 2
}})
```
