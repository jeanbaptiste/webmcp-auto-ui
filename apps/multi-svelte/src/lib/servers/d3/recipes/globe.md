---
widget: globe
description: Interactive globe (orthographic projection with drag rotation)
group: d3
schema:
  type: object
  properties:
    title:
      type: string
    geojson:
      type: object
      description: "GeoJSON FeatureCollection for land masses"
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
          radius:
            type: number
    rotate:
      type: array
      description: "Initial rotation [lambda, phi, gamma] in degrees (default: [0,-20,0])"
      items:
        type: number
    colorScheme:
      type: string
---

## When to use
For showing global data with a 3D perspective. Supports drag-to-rotate interaction. Good for showing point locations on Earth.

## How
1. Get world GeoJSON and point data from MCP
2. Call `d3_webmcp_widget_display({name: "globe", params: {geojson: worldGeo, points: [{lat: 48.8, lon: 2.3, label: "Paris"}, {lat: 40.7, lon: -74, label: "NYC"}], rotate: [-2, -48, 0]}})`

## Common errors
- Points on the back side of the globe are automatically hidden
- Provide GeoJSON for land masses (world-110m or equivalent)
- `rotate` centers the view: use negative longitude to show a specific region
