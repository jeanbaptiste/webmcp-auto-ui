---
widget: protomaps-hillshading
description: Render a raster .pmtiles archive (hillshade or DEM imagery) as a tiled raster source.
group: protomaps
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: "HTTPS URL to a raster .pmtiles archive (terrain, hillshade, satellite)" }
    center: { type: array }
    zoom: { type: number }
    tileSize: { type: number, description: "Tile size in pixels (default 512)" }
    opacity: { type: number, description: "0..1 (default 1)" }
---

## When to use
Visualize hillshade, DEM, or satellite imagery distributed as a single .pmtiles archive.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-hillshading", params: {
  url: "https://example.com/terrain.pmtiles",
  center: [86.9, 27.99], zoom: 9
}})
```
