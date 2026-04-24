---
widget: vega-geo
description: Choropleth map from a GeoJSON FeatureCollection + id→value mapping.
group: vega
schema:
  type: object
  required: [geojson, values]
  properties:
    title: { type: string }
    geojson: { type: object, description: GeoJSON FeatureCollection. Each feature should have an id (feature.id or properties[idField]) }
    values: { type: object, description: "Map { featureId: numericValue }" }
    idField: { type: string, description: Properties field to use as id (fallback if feature.id missing). Default 'id' }
    scheme: { type: string, description: Vega color scheme (default blues) }
    projection: { type: string, description: "Projection name: mercator, equalEarth, naturalEarth1, albersUsa..." }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-geo", params: { geojson: <FeatureCollection>, values: { FR: 42, DE: 30, IT: 22 }, scheme: "blues" } })
```
