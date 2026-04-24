---
widget: observable-plot-geo
description: Render GeoJSON features (polygons, lines, points) with a projection.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    geojson: { type: object, description: "GeoJSON FeatureCollection or Feature" }
    projection: { type: [string, object], description: "'mercator','equal-earth','albers','orthographic', etc." }
    fill: { type: [string, object] }
    stroke: { type: string }
    strokeWidth: { type: number }
    fillOpacity: { type: number }
    tip: { type: boolean }
---

## When to use
Thematic maps, choropleths, country boundaries.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-geo", params: { geojson: {...}, fill:'#cde' }})
```
