---
widget: protomaps-dark
description: Protomaps basemap with a dark theme — high contrast, nighttime UI friendly.
group: protomaps
schema:
  type: object
  properties:
    url: { type: string }
    center: { type: array }
    zoom: { type: number }
---

## When to use
Dashboards, dark-mode UIs, dramatic data overlays.

## Example
```
protomaps_webmcp_widget_display({name: "protomaps-dark", params: { center: [-74, 40.7], zoom: 11 }})
```
