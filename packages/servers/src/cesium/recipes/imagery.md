---
widget: cesium-imagery
description: Switch the basemap imagery (OSM, OpenTopoMap, CARTO, Esri World, custom URL).
group: cesium
schema:
  type: object
  properties:
    provider: { type: string, description: "'osm' | 'opentopomap' | 'cartolight' | 'cartodark' | 'esri' | 'url'" }
    url: { type: string, description: URL template (e.g. https://.../{z}/{x}/{y}.png) when provider='url' }
---

## When to use
Pick a tile basemap suited to the data — topographic, dark, satellite, or custom XYZ.

## Example
```
cesium_webmcp_widget_display({name: "cesium-imagery", params: { provider: "esri" }})
```
