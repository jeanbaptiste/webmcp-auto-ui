---
widget: openlayers-osm
description: OpenStreetMap tile source. Equivalent to the default basemap.
group: openlayers
schema:
  type: object
  properties:
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## When to use
Same as `openlayers-map` but explicitly named for clarity in catalogs.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-osm", params: { center: [2.35, 48.85], zoom: 5 }})
```
