---
widget: symbol-map
description: Symbol map (sized/colored points on a geographic map)
group: d3
schema:
  type: object
  required:
    - geojson
    - points
  properties:
    title:
      type: string
    geojson:
      type: object
      description: "GeoJSON FeatureCollection for the base map"
    points:
      type: array
      items:
        type: object
        required:
          - lat
          - lon
        properties:
          lat:
            type: number
          lon:
            type: number
          label:
            type: string
          value:
            type: number
            description: "Controls circle size"
          color:
            type: string
          group:
            type: number
    projection:
      type: string
      description: "D3 projection name (default: geoMercator)"
    colorScheme:
      type: string
---

## When to use
For showing point-level geographic data where size encodes quantity (city populations, earthquake magnitudes, store revenue).

## How
1. Get GeoJSON base map and point data from MCP
2. Call `d3_webmcp_widget_display('symbol-map', {geojson: countryGeo, points: [{lat:48.8,lon:2.3,label:"Paris",value:2100000},{lat:45.7,lon:4.8,label:"Lyon",value:500000}]})`

## Common errors
- `value` controls circle size via square root scaling
- Ensure lat/lon are in the correct range (-90 to 90, -180 to 180)
