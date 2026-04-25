---
widget: protomaps-white
description: Ultra-minimal white-on-white Protomaps basemap. Almost invisible — for delicate overlays.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string }
    center: { type: array }
    zoom: { type: number }
---

## When to use
You want geographic context to be a whisper, not a statement. Pair with strong overlays.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-white", params: { center: [0, 20], zoom: 2 }})
```
