---
widget: cesium-kml
description: Load a KML or KMZ document on the globe.
group: cesium
schema:
  type: object
  required: [url]
  properties:
    url: { type: string, description: URL to a KML or KMZ file }
    clampToGround: { type: boolean, description: Drape geometries on terrain (default true) }
    zoomTo: { type: boolean, description: Auto-zoom (default true) }
---

## When to use
Display Google Earth datasets, hiking GPS tracks, or any pre-existing KML/KMZ overlay.

## Example
```
cesium_webmcp_widget_display({name: "cesium-kml", params: { url: "https://example.com/track.kml" }})
```
