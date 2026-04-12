---
widget: leaflet-video-overlay
description: Overlay a video on specific geographic bounds
group: overlays
schema:
  type: object
  properties:
    center:
      type: array
      items: { type: number }
    zoom:
      type: number
    videoUrl:
      type: string
      description: "URL of the video (or array of URLs for multiple formats)"
    bounds:
      type: array
      description: "[[southWest lat, lng], [northEast lat, lng]]"
    opacity:
      type: number
    autoplay:
      type: boolean
    loop:
      type: boolean
    muted:
      type: boolean
  required: [videoUrl, bounds]
---

## Video Overlay

Places a video element on the map within geographic bounds. Supports autoplay, looping, and muting.

## How
1. Call `leaflet_webmcp_widget_display({name: "leaflet-video-overlay", params: {videoUrl: "https://example.com/video.webm", bounds: [[32, -130], [13, -100]], autoplay: true, loop: true, opacity: 0.7}})`

### Example

```json
{
  "videoUrl": "https://www.mapbox.com/bites/00188/patricia_nasa.webm",
  "bounds": [[32, -130], [13, -100]],
  "opacity": 0.7,
  "autoplay": true,
  "loop": true
}
```
