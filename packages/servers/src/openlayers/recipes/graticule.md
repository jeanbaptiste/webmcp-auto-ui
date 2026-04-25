---
widget: openlayers-graticule
description: Lat/lon graticule overlay (meridians and parallels) on an OSM basemap.
group: openlayers
schema:
  type: object
  properties:
    showLabels: { type: boolean, description: "Show coordinate labels (default true)" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-graticule", params: { zoom: 2 }})
```
