---
widget: protomaps-overture
description: Render Overture Maps tiles via .pmtiles — open-data alternative to OSM (transportation, places, buildings, base).
group: protomaps
schema:
  type: object
  properties:
    url: { type: string, description: "HTTPS URL to an Overture .pmtiles archive" }
    center: { type: array }
    zoom: { type: number }
    sourceLayer: { type: string, description: "Focus on a single layer (e.g. 'places', 'transportation', 'buildings', 'base')" }
    layerType: { type: string, description: "'fill' | 'line' | 'circle' (only used when sourceLayer is set)" }
    paint: { type: object, description: "MapLibre paint overrides for the focused layer" }
---

## When to use
Visualize Overture Maps open data. Without `sourceLayer`, all four common themes render together.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-overture", params: {
  url: "https://example.com/overture-places.pmtiles",
  sourceLayer: "places",
  layerType: "circle",
  center: [-100, 40], zoom: 4
}})
```
