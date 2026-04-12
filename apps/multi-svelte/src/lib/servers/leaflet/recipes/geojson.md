---
widget: leaflet-geojson
description: Render GeoJSON features (points, lines, polygons) on a Leaflet map
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
      description: "A valid GeoJSON FeatureCollection or Feature"
    style:
      type: object
      description: "Leaflet path style options (color, weight, fillOpacity, etc.)"
  required: [geojson]
---

## GeoJSON

Renders any valid GeoJSON (FeatureCollection, Feature, or Geometry). Each feature gets an automatic popup showing its properties. Auto-fits map bounds.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-geojson", params: {geojson: {type: "FeatureCollection", features: [{type: "Feature", properties: {name: "Zone A"}, geometry: {type: "Polygon", coordinates: [[[2.33, 48.84], [2.37, 48.84], [2.37, 48.87], [2.33, 48.87], [2.33, 48.84]]]}}]}, style: {color: "#e74c3c", weight: 2, fillOpacity: 0.3}}})`

### Example

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "name": "Zone A", "value": 42 },
        "geometry": { "type": "Polygon", "coordinates": [[[2.33, 48.84], [2.37, 48.84], [2.37, 48.87], [2.33, 48.87], [2.33, 48.84]]] }
      }
    ]
  },
  "style": { "color": "#e74c3c", "weight": 2, "fillOpacity": 0.3 }
}
```
