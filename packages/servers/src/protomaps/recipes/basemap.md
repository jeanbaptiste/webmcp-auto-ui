---
widget: protomaps-basemap
description: Protomaps (.pmtiles) basemap rendered with MapLibre. Single-file vector tiles served via HTTP Range — no tile server required.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string, description: "HTTPS URL to a .pmtiles archive (default: public Protomaps demo)" }
    center: { type: array, description: "[lon, lat] center" }
    zoom: { type: number, description: "Initial zoom level" }
    theme: { type: string, description: "'light' | 'dark' | 'grayscale' | 'white' | 'black' (default: light)" }
---

## When to use
General-purpose worldwide basemap from a single `.pmtiles` file. No API key, no tile server. Ideal for offline-friendly maps and self-hosted bundles.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-basemap", params: { center: [2.35, 48.85], zoom: 11, theme: "light" }})
```
