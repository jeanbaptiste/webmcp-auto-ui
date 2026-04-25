---
widget: protomaps-light
description: Protomaps basemap with the official "light" theme (paper-like, soft pastels).
group: protomaps
schema:
  type: object
  properties:
    url: { type: string, description: "HTTPS URL to a .pmtiles archive (default: public demo)" }
    center: { type: array }
    zoom: { type: number }
---

## When to use
Default daytime cartography. Good for general-purpose maps and printed-style outputs.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-light", params: { center: [2.35, 48.85], zoom: 11 }})
```
