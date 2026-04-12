---
widget: choropleth
description: Choropleth map (geographic regions colored by value)
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
      description: "GeoJSON FeatureCollection with features to render"
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
            description: "Must match feature.properties.id or feature.properties.name"
          value:
            type: number
    projection:
      type: string
      description: "D3 projection name (default: geoMercator)"
    colorScheme:
      type: string
      description: "Sequential color scheme name (default: Blues)"
---

## When to use
For showing regional statistics on a map (GDP by country, temperature by state, election results).

## How
1. Get GeoJSON and values from MCP
2. Call `d3_webmcp_widget_display({name: "choropleth", params: {geojson: {...}, values: [{id: "France", value: 67}, {id: "Germany", value: 83}]}})`

## Common errors
- `values[].id` must match `feature.properties.name` or `feature.properties.id` in the GeoJSON
- GeoJSON must be a valid FeatureCollection
- Choose appropriate projection for the region (geoMercator for world, geoAlbersUsa for US)
