---
widget: leaflet-vector-grid
description: Render vector tiles (MVT/PBF) on a Leaflet map
group: base-layers
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    url:
      type: string
      description: "Vector tile URL template (PBF/MVT)"
    vectorTileLayerStyles:
      type: object
      description: "Style definitions per layer"
    interactive:
      type: boolean
  required: [url]
---

## Vector Grid

Renders Mapbox Vector Tiles (MVT/PBF) using the Leaflet.VectorGrid plugin. Supports interactive layers with custom styling.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-vector-grid", params: {center: [48.85, 2.35], zoom: 14, url: "https://tiles.example.com/{z}/{x}/{y}.pbf"}})`

### Example

```json
{
  "center": [48.8566, 2.3522],
  "zoom": 14,
  "url": "https://tiles.example.com/{z}/{x}/{y}.pbf",
  "vectorTileLayerStyles": {
    "water": { "fill": true, "fillColor": "#3388ff", "fillOpacity": 0.5 }
  }
}
```
