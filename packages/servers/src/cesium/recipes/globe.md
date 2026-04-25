---
widget: cesium-globe
description: Empty 3D globe centered on a longitude/latitude. Base for any geo visualization.
group: cesium
schema:
  type: object
  properties:
    longitude: { type: number, description: Initial longitude (degrees) }
    latitude: { type: number, description: Initial latitude (degrees) }
    height: { type: number, description: Initial camera height in meters (default 10000000) }
---

## When to use
First building block — show a 3D globe with no data, or as a base for follow-up widgets.

## Example
```
cesium_webmcp_widget_display({name: "cesium-globe", params: { longitude: 2.35, latitude: 48.85, height: 5000000 }})
```
