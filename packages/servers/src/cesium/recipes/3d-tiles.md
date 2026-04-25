---
widget: cesium-3d-tiles
description: Load a 3D Tiles dataset (photogrammetry, BIM, point cloud) by URL or Ion asset id.
group: cesium
schema:
  type: object
  properties:
    url: { type: string, description: URL to a tileset.json }
    ionAssetId: { type: number, description: Cesium Ion asset id (requires Ion access token) }
    zoomTo: { type: boolean, description: Auto-zoom to tileset (default true) }
---

## When to use
Display large 3D city models, BIM buildings, or photogrammetric point clouds.

## Example
```
cesium_webmcp_widget_display({name: "cesium-3d-tiles", params: { url: "https://example.com/tileset.json" }})
```

## Note
Cesium Ion assets (`ionAssetId`) require `Cesium.Ion.defaultAccessToken` to be set in the host app. URL-based tilesets do not.
