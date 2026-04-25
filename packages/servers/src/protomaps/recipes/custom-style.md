---
widget: protomaps-custom-style
description: Render an arbitrary .pmtiles archive with a caller-supplied MapLibre style JSON.
group: protomaps
schema:
  type: object
  required: [url, style]
  properties:
    url: { type: string, description: "HTTPS URL to a .pmtiles archive" }
    style: { type: object, description: "MapLibre style JSON (sources.protomaps will be auto-injected to point at url)" }
    center: { type: array, description: "[lon, lat] center" }
    zoom: { type: number, description: "Initial zoom level" }
---

## When to use
You have a custom MapLibre style JSON and want to bind it to your own pmtiles archive.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-custom-style", params: {
  url: "https://example.com/my-tiles.pmtiles",
  style: { version: 8, sources: {}, layers: [
    { id: "bg", type: "background", paint: { "background-color": "#fff" } },
    { id: "rd", type: "line", source: "protomaps", "source-layer": "roads", paint: { "line-color": "#000" } }
  ]},
  center: [2.35, 48.85], zoom: 12
}})
```
