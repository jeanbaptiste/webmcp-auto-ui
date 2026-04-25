---
widget: leaflet-image-overlay
description: Overlay an image on specific geographic bounds
group: overlays
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    imageUrl:
      type: string
      description: "URL of the image to overlay"
    bounds:
      type: array
      description: "[[southWest lat, lng], [northEast lat, lng]]"
    opacity:
      type: number
  required: [imageUrl, bounds]
---

## Image Overlay

Places an image on the map anchored to geographic bounds. Useful for historical maps, satellite imagery crops, or floor plans.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-image-overlay", params: {imageUrl: "https://example.com/map.png", bounds: [[48.83, 2.30], [48.88, 2.40]], opacity: 0.6}})`

## Example

```json
{
  "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Paris_plan_jms.png/800px-Paris_plan_jms.png",
  "bounds": [[48.83, 2.30], [48.88, 2.40]],
  "opacity": 0.6
}
```
