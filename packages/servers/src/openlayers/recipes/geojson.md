---
widget: openlayers-geojson
description: Load and render a GeoJSON FeatureCollection (URL or inline) on an OSM basemap.
group: openlayers
schema:
  type: object
  properties:
    url: { type: string }
    geojson: { type: object, description: "Inline FeatureCollection (EPSG:4326)" }
    style:
      type: object
      properties:
        fill: { type: string }
        stroke: { type: string }
        strokeWidth: { type: number }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## When to use
Visualize a GeoJSON feature collection with default or custom styling.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-geojson", params: {
  url: "https://openlayers.org/en/latest/examples/data/geojson/countries.geojson",
  zoom: 2, center: [0, 30]
}})
```
