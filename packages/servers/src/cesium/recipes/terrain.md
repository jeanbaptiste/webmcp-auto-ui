---
widget: cesium-terrain
description: Set a terrain provider (default ellipsoid, or custom Cesium terrain URL).
group: cesium
schema:
  type: object
  properties:
    url: { type: string, description: URL to a Cesium terrain endpoint (optional) }
    ellipsoid: { type: boolean, description: Use flat ellipsoid terrain (default true if no url) }
    depthTest: { type: boolean, description: Depth-test entities against terrain (default true) }
---

## When to use
Toggle on real elevation. Cesium World Terrain requires an Ion access token; without it, leave default ellipsoid.

## Example
```
cesium_webmcp_widget_display({name: "cesium-terrain", params: { ellipsoid: true }})
```

## Note
Cesium Ion terrain (`https://assets.cesium.com/...`) requires an Ion access token configured globally. Without a token, fall back to ellipsoid terrain.
