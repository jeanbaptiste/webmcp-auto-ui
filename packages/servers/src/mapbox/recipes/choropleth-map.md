---
widget: choropleth-map
description: Choropleth map with colored regions based on data values (GeoJSON polygons)
group: mapbox
schema:
  type: object
  properties:
    geojson:
      type: object
      description: GeoJSON FeatureCollection with polygon features
    features:
      type: array
      description: Alternative to geojson — array of GeoJSON features
    property:
      type: string
      description: Feature property to use for coloring (default "value")
    nameProperty:
      type: string
      description: Feature property for display name (default "name")
    colors:
      type: array
      description: Array of color hex strings for the scale
    stops:
      type: array
      description: Numeric stops for the color interpolation
    fillOpacity:
      type: number
      description: Fill opacity (0-1, default 0.7)
    outlineColor:
      type: string
      description: Outline color (default "#333")
    fitBounds:
      type: boolean
      description: Auto-fit map to data bounds
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Display geographic data as colored regions. Provide a GeoJSON FeatureCollection where each polygon has a numeric property used for color interpolation.

## How
1. Call `mapbox_webmcp_widget_display({name: "choropleth-map", params: {geojson: {type: "FeatureCollection", features: [{type: "Feature", properties: {name: "Region A", value: 75}, geometry: {type: "Polygon", coordinates: [[[2.0,48.5],[2.5,48.5],[2.5,49.0],[2.0,49.0],[2.0,48.5]]]}}]}, property: "value", colors: ["#f7fbff", "#4292c6", "#084594"], stops: [0, 50, 100], fitBounds: true}})`

## Example

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {"type": "Feature", "properties": {"name": "Region A", "value": 75}, "geometry": {"type": "Polygon", "coordinates": [[[2.0,48.5],[2.5,48.5],[2.5,49.0],[2.0,49.0],[2.0,48.5]]]}}
    ]
  },
  "property": "value",
  "colors": ["#f7fbff", "#4292c6", "#084594"],
  "stops": [0, 50, 100],
  "fitBounds": true
}
```
