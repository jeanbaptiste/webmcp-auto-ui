---
widget: vegalite-geoshape
description: Choropleth / geoshape map (Vega-Lite geoshape mark with GeoJSON or TopoJSON).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    topojson: { type: object, description: "TopoJSON object" }
    geojson: { type: object, description: "GeoJSON FeatureCollection (alternative to topojson)" }
    feature: { type: string, description: "TopoJSON feature collection name (default 'features')" }
    projection: { type: string, description: "mercator | equalEarth | albersUsa | naturalEarth1 | ..." }
    valueField: { type: string, description: "Feature property name for color (choropleth)" }
    scheme: { type: string }
---

## When to use
Display regions coloured by a metric (requires a TopoJSON / GeoJSON input).
