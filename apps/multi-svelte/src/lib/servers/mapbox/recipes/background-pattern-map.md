---
widget: background-pattern-map
description: Polygon fill with custom pattern (diagonal, dots, crosshatch, horizontal)
group: mapbox
schema:
  type: object
  properties:
    geojson:
      type: object
      description: GeoJSON FeatureCollection with polygon features
    features:
      type: array
      description: Alternative to geojson
    patternType:
      type: string
      description: Pattern style — diagonal, dots, crosshatch, or horizontal (default "diagonal")
    patternColor:
      type: string
      description: Pattern stroke color (default "#6366f1")
    backgroundColor:
      type: string
      description: Pattern background color (default "#f8fafc")
    patternSize:
      type: number
      description: Pattern tile size in pixels (default 16)
    opacity:
      type: number
      description: Fill opacity (default 0.8)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Fill polygons with a repeating pattern instead of solid color. Useful for distinguishing zones on maps where color alone is insufficient (accessibility, print-friendly).

## How
1. Call `mapbox_webmcp_widget_display({name: "background-pattern-map", params: {geojson: {type: "FeatureCollection", features: [{type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.9],[2.3,48.8]]]}}]}, patternType: "crosshatch", patternColor: "#ef4444", center: [2.35, 48.85], zoom: 11}})`

## Example

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.9],[2.3,48.8]]]}}
    ]
  },
  "patternType": "crosshatch",
  "patternColor": "#ef4444",
  "center": [2.35, 48.85],
  "zoom": 11
}
```
