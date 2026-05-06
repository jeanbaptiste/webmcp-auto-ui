---
widget: openlayers-osm
description: OpenStreetMap tile source. Equivalent to the default basemap.
group: openlayers
schema:
  type: object
  properties:
    center:
      description: "Map center. Use object form { lat, lon } to avoid lat/lon swap. Array form [lon, lat] also accepted (note: longitude FIRST, latitude second)."
      oneOf:
        - type: array
          items: { type: number }
          minItems: 2
          maxItems: 2
        - type: object
          required: [lat, lon]
          properties:
            lat: { type: number, minimum: -90, maximum: 90 }
            lon: { type: number, minimum: -180, maximum: 180 }
    zoom: { type: number }
---

## When to use
Same as `openlayers-map` but explicitly named for clarity in catalogs.

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-osm", params: { center: { lat: 48.85, lon: 2.35 }, zoom: 5 }})
```
