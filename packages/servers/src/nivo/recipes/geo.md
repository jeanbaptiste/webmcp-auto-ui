---
widget: nivo-geo
description: Choropleth map — colors regions based on a numeric value. Requires GeoJSON features.
group: nivo
schema:
  type: object
  required: [data, features]
  properties:
    data: { type: array, description: "[{id: 'FRA', value: 42}, ...] — id must match feature id" }
    features: { type: array, description: "GeoJSON features array" }
    domain: { type: array, description: "Value domain [min, max] (default [0, 1_000_000])" }
    colors: { type: string, description: "Color scheme name (default 'blues')" }
    projectionType: { type: string, description: "'mercator' (default), 'orthographic', 'equirectangular', ..." }
    projectionScale: { type: number, description: Scale factor (default 100) }
---

## When to use
Color world/country regions by a numeric metric. Provide GeoJSON features (e.g. world countries) in `features`.

## Example
```
nivo_webmcp_widget_display({name: "nivo-geo", params: { data: [{id:'FRA', value: 50}], features: [/* geojson */] }})
```
