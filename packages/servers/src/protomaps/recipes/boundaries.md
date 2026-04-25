---
widget: protomaps-boundaries
description: Render only administrative boundaries from .pmtiles — country/state/region outlines.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string }
    center: { type: array }
    zoom: { type: number }
    color: { type: string }
    background: { type: string }
---

## When to use
Geopolitical context, election maps, administrative reports — when borders matter and roads/buildings would be noise.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-boundaries", params: { center: [10, 50], zoom: 3 }})
```
