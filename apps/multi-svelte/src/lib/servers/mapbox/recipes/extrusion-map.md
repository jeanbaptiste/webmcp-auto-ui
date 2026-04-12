---
widget: extrusion-map
description: 3D extruded polygons with height based on data values
group: mapbox
schema:
  type: object
  properties:
    geojson:
      type: object
      description: GeoJSON FeatureCollection with polygon features having height property
    features:
      type: array
      description: Alternative to geojson
    heightProperty:
      type: string
      description: Feature property for extrusion height (default "height")
    maxHeight:
      type: number
      description: Maximum height value for color scale (default 500)
    colorProperty:
      type: string
      description: Feature property for color (defaults to heightProperty)
    colorLow:
      type: string
      description: Color for low values (default "#ffffcc")
    colorMid:
      type: string
      description: Color for mid values (default "#fd8d3c")
    colorHigh:
      type: string
      description: Color for high values (default "#800026")
    opacity:
      type: number
      description: Extrusion opacity (default 0.8)
    pitch:
      type: number
      description: Map pitch angle (default 45)
    bearing:
      type: number
      description: Map bearing (default -17)
    center:
      type: array
      description: Map center [lng, lat]
    zoom:
      type: number
      description: Initial zoom level
---

## Usage

Display 3D extruded polygons where height and color represent data values. Great for population density, building heights, or any area-based quantitative data.

## Example

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {"type": "Feature", "properties": {"height": 200, "name": "District A"}, "geometry": {"type": "Polygon", "coordinates": [[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.9],[2.3,48.8]]]}}
    ]
  },
  "heightProperty": "height",
  "maxHeight": 500,
  "pitch": 50,
  "center": [2.35, 48.85],
  "zoom": 11
}
```
