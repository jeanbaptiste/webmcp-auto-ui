---
widget: mapbox-choropleth
description: Vector choropleth map colored by a GeoJSON property. Requires a Mapbox access token.
group: mapbox
schema:
  type: object
  required:
    - accessToken
    - geojson
    - property
  properties:
    accessToken:
      type: string
      description: Mapbox public access token (pk.*)
    geojson:
      type: object
      description: GeoJSON FeatureCollection with polygons
    property:
      type: string
      description: Feature property name to color by (numeric)
    colorScale:
      type: array
      description: "Array of CSS colors for interpolation (default blue-to-red)"
      items:
        type: string
    center:
      type: array
      description: "[lng, lat] center of the map"
      items:
        type: number
    zoom:
      type: number
      description: Initial zoom level (default 3)
    opacity:
      type: number
      description: Fill opacity 0-1 (default 0.7)
    extrude:
      type: boolean
      description: Enable 3D fill-extrusion based on property value (default false)
---

## When to use

Color regions/polygons by a numeric property: population density, GDP, temperature,
election results, sales per region — any thematic map on polygon data.

Requires a Mapbox access token and a GeoJSON FeatureCollection with the target property on each feature.

## How

Call `widget_display('mapbox-choropleth', { accessToken: '...', geojson: {...}, property: 'density' })`.

The widget automatically computes min/max from the property values and interpolates the color scale.
Set `extrude: true` for a 3D fill-extrusion effect proportional to the property value.

Example — country GDP:
```
widget_display('mapbox-choropleth', {
  accessToken: "pk.xxx",
  geojson: countriesGeoJson,
  property: "gdp_per_capita",
  colorScale: ["#f7fbff", "#08306b"],
  center: [10, 50],
  zoom: 3
})
```

## Common errors

- GeoJSON features missing the specified `property` — those polygons render transparent
- Property values are strings instead of numbers — cast to number before passing
- Passing a single Feature instead of a FeatureCollection
- Very large GeoJSON (>5MB) — simplify geometries or use vector tiles
