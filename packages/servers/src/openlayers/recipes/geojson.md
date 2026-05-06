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
Visualize a GeoJSON feature collection with default or custom styling.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-geojson", params: {
  url: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
  zoom: 2, center: { lat: 30, lon: 0 }
}})
```
