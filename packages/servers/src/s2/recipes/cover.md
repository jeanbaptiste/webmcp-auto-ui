---
widget: s2-cover
description: S2 RegionCoverer of a GeoJSON polygon — renders the covering cells over the input.
group: s2
schema:
  type: object
  required: [geojson]
  properties:
    geojson:
      type: object
      description: A GeoJSON Polygon, Feature, or FeatureCollection (first polygon used)
    minLevel: { type: number, description: "Minimum S2 level (default 4)" }
    maxLevel: { type: number, description: "Maximum S2 level (default 12)" }
    maxCells: { type: number, description: "Max cells in covering (default 32)" }
    style: { type: string }
---

## When to use
Approximate an arbitrary polygon with a small set of S2 cells (search precomputation, indexing).

## Example
```
s2_webmcp_widget_display({name: "s2-cover", params: { maxCells: 16, geojson: { type: "Polygon", coordinates: [[[2.2,48.8],[2.4,48.8],[2.4,48.9],[2.2,48.9],[2.2,48.8]]] }}})
```
