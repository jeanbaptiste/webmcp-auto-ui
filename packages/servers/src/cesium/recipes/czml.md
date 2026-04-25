---
widget: cesium-czml
description: Load a CZML document (Cesium's native time-aware data format).
group: cesium
schema:
  type: object
  properties:
    url: { type: string, description: URL to a CZML JSON document }
    czml: { type: array, description: Inline CZML packet array (alternative to url) }
    zoomTo: { type: boolean, description: Auto-zoom to data (default true) }
---

## When to use
Animated, time-stamped trajectories or any pre-built Cesium dataset packaged as CZML.

## Example
```
cesium_webmcp_widget_display({name: "cesium-czml", params: { url: "https://example.com/satellite.czml" }})
```
