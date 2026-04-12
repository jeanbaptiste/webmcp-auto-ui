---
widget: projection-map
description: Flat projection map (configurable projection with optional values)
group: d3
schema:
  type: object
  required:
    - geojson
  properties:
    title:
      type: string
    geojson:
      type: object
      description: "GeoJSON FeatureCollection"
    values:
      type: array
      items:
        type: object
        required:
          - id
          - value
        properties:
          id:
            type: string
          value:
            type: number
    projection:
      type: string
      description: "D3 projection: geoNaturalEarth1, geoMercator, geoEquirectangular, geoOrthographic, etc. (default: geoNaturalEarth1)"
    colorScheme:
      type: string
      description: "Sequential color scheme name (default: Greens)"
---

## When to use
For flat world or regional maps with various projections. Use instead of choropleth when you want a specific projection aesthetic.

## How
1. Get GeoJSON from MCP
2. Call `d3_webmcp_widget_display('projection-map', {geojson: worldGeo, projection: "geoNaturalEarth1", values: [{id: "Brazil", value: 210}]})`

## Common errors
- Available projections: geoMercator, geoNaturalEarth1, geoEquirectangular, geoAlbersUsa, geoConicEqualArea, etc.
- geoAlbersUsa only works with US data
