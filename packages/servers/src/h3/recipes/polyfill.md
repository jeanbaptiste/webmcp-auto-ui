---
widget: h3-polyfill
description: polygonToCells(polygon, resolution) — fill a GeoJSON polygon with H3 hexagons
group: h3
schema:
  type: object
  required: [geojson]
  properties:
    geojson:
      description: "GeoJSON Polygon, MultiPolygon, Feature or FeatureCollection"
    resolution: { type: number, description: "H3 resolution (default 7)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
    color: { type: string, description: "Hex fill color (default '#2ca02c')" }
    opacity: { type: number, description: "Fill opacity (default 0.4)" }
---

## When to use
Tile an arbitrary polygon (admin boundary, custom region) with H3 hexes for area-weighted aggregation.

## Example
```
h3_webmcp_widget_display({name: "h3-polyfill", params: { resolution: 7, geojson: { type: "Polygon", coordinates: [[[2.25,48.81],[2.42,48.81],[2.42,48.91],[2.25,48.91],[2.25,48.81]]] } }})
```
