---
widget: h3-resolution-compare
description: Overlay the same region at multiple H3 resolutions to compare granularity
group: h3
schema:
  type: object
  required: [lat, lng]
  properties:
    lat: { type: number }
    lng: { type: number }
    resolutions:
      type: array
      description: "Resolutions to overlay (default [5, 7, 9])"
      items: { type: number }
    k: { type: number, description: "Disk radius at each resolution (default 3)" }
    style: { type: string, description: "Basemap (default 'positron')" }
---

## When to use
Compare H3 cell sizes side by side. Useful when picking a resolution for a use case (display vs aggregation vs storage).

## Example
```
h3_webmcp_widget_display({name: "h3-resolution-compare", params: { lat: 35.6762, lng: 139.6503, resolutions: [4, 6, 8], k: 2 }})
```
