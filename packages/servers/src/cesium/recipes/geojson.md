---
widget: cesium-geojson
description: Load a GeoJSON file or inline object as a styled vector layer.
group: cesium
schema:
  type: object
  properties:
    url: { type: string, description: URL to a GeoJSON file (or pass inline `geojson`) }
    geojson: { type: object, description: Inline GeoJSON FeatureCollection }
    stroke: { type: string, description: CSS color for outlines }
    fill: { type: string, description: CSS color for polygon fills }
    fillAlpha: { type: number, description: Fill alpha 0..1 (default 0.45) }
    strokeWidth: { type: number, description: Outline width (default 2) }
    clampToGround: { type: boolean, description: Drape on terrain (default true) }
    zoomTo: { type: boolean, description: Auto-zoom (default true) }
---

## When to use
Country boundaries, election results, any vector overlay distributed as GeoJSON.

## Example
```
cesium_webmcp_widget_display({name: "cesium-geojson", params: { url: "https://example.com/countries.geojson", fill: "#0ea5e9" }})
```
