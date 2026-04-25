---
widget: harp-data-source
description: Custom OMV/MVT vector tile data source for Harp.gl.
group: harp
schema:
  type: object
  properties:
    title: { type: string }
    baseUrl: { type: string, description: Tile endpoint (default HERE Vector Tile API) }
    apiFormat: { type: number, description: APIFormat enum value }
    styleSetName: { type: string, description: Theme styleset (default 'tilezen') }
    apiKey: { type: string }
    center: { type: array }
    zoom: { type: number }
    tilt: { type: number }
    heading: { type: number }
    projection: { type: string, description: "'mercator' or 'sphere'" }
    theme: { type: string }
---

## When to use
Point Harp at a custom OMV/MVT endpoint (HERE, custom Tilezen mirror, etc.).

## Example
```
harp_webmcp_widget_display({name: "harp-data-source", params: {
  baseUrl: "https://vector.hereapi.com/v2/vectortiles/base/mc",
  apiKey: "...",
  center: [2.35, 48.86], zoom: 12
}})
```
