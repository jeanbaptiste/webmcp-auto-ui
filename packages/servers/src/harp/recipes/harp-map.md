---
widget: harp-map
description: Basic 3D vector tile map (Harp.gl, mercator). HERE/Harp is archived — best-effort rendering.
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    center: { type: array, description: "[lng, lat], default [13.405, 52.52] (Berlin)" }
    zoom: { type: number, description: Zoom level (default 14) }
    tilt: { type: number, description: Camera tilt in degrees (default 0) }
    heading: { type: number, description: Camera heading in degrees (default 0) }
    theme: { type: string, description: URL of a Harp theme JSON }
    apiKey: { type: string, description: HERE Vector Tile API key (required to see tiles) }
---

## When to use
Default Harp.gl map. Without a HERE `apiKey` the tiles won't load — the canvas stays empty.

## Example
```
harp_webmcp_widget_display({name: "harp-map", params: { center: [2.35, 48.86], zoom: 12 }})
```
