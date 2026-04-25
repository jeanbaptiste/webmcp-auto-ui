---
widget: openlayers-image-static
description: Display a static image (scan, plan, illustration) georeferenced to an extent.
group: openlayers
schema:
  type: object
  required: [url, extent]
  properties:
    url: { type: string, description: "Image URL" }
    extent: { type: array, items: { type: number }, description: "[minX, minY, maxX, maxY]" }
    projection: { type: string, description: "Default 'EPSG:4326'" }
    center: { type: array, items: { type: number } }
    zoom: { type: number }
---

## Example
```
openlayers_webmcp_widget_display({name: "openlayers-image-static", params: {
  url: "https://imgs.xkcd.com/comics/online_communities.png",
  extent: [0, 0, 1024, 968], projection: "EPSG:4326"
}})
```
