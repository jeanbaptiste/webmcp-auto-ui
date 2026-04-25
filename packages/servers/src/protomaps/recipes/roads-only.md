---
widget: protomaps-roads-only
description: Render only the road network from .pmtiles — clean line art, no buildings or labels.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string }
    center: { type: array }
    zoom: { type: number }
    color: { type: string, description: "Road line color (default '#222')" }
    background: { type: string, description: "Background color" }
---

## When to use
Aesthetic city maps, route emphasis, infographic backdrops.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-roads-only", params: {
  center: [2.35, 48.85], zoom: 12, color: "#000", background: "#fff"
}})
```
