---
widget: leaflet-choropleth
description: Thematic map with colored regions based on a data value
group: data
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    geojson:
      type: object
      description: "GeoJSON FeatureCollection with numeric property for coloring"
    valueProperty:
      type: string
      description: "Property name containing numeric value (default: 'value')"
    steps:
      type: number
      description: "Number of color steps (default: 6)"
    colors:
      type: array
      items: { type: string }
      description: "Array of hex colors from low to high"
    legend:
      type: boolean
  required: [geojson]
---

## Choropleth

Colors polygons by a numeric property to show geographic distribution. Includes an automatic legend.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-choropleth", params: {center: [47.0, 2.0], zoom: 5, geojson: {type: "FeatureCollection", features: []}, valueProperty: "population", steps: 5, colors: ["#ffffcc", "#41b6c4", "#253494"], legend: true}})`

## Example

```json
{
  "center": [47.0, 2.0],
  "zoom": 5,
  "geojson": { "type": "FeatureCollection", "features": [] },
  "valueProperty": "population",
  "steps": 5,
  "colors": ["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"],
  "legend": true
}
```
