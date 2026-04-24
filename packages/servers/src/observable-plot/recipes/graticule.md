---
widget: observable-plot-graticule
description: Sphere + graticule (latitude/longitude grid) on a projected map. Optional overlay GeoJSON.
group: observable-plot
schema:
  type: object
  properties:
    title: { type: string }
    projection: { type: string }
    geojson: { type: object }
    stroke: { type: string }
    sphereStroke: { type: string }
    fill: { type: string }
    featureStroke: { type: string }
---

## When to use
World maps with lat/long grid for geographic context.

## Example
```
observable-plot_webmcp_widget_display({name: "observable-plot-graticule", params: { projection:'equal-earth' }})
```
