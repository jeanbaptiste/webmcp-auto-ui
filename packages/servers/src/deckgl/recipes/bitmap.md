---
widget: deckgl-bitmap
description: Overlay an image (PNG/JPEG) at a geographic bounding box.
group: deckgl
schema:
  type: object
  required: [image, bounds]
  properties:
    image: { type: string, description: "URL of the image" }
    bounds: { type: array, description: "[west, south, east, north]" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number }
    opacity: { type: number }
---

## When to use
Static raster overlays — historical maps, satellite snapshots, weather images.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-bitmap", params: {
  image: "https://example.com/map.png",
  bounds: [-122.5, 37.7, -122.3, 37.85]
}})
```
