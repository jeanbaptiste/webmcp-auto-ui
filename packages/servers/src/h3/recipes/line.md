---
widget: h3-line
description: H3 cell chain between two points, overlaid on a straight line for comparison
group: h3
schema:
  type: object
  required: [from, to]
  properties:
    from:
      type: object
      required: [lat, lng]
      properties: { lat: { type: number }, lng: { type: number } }
    to:
      type: object
      required: [lat, lng]
      properties: { lat: { type: number }, lng: { type: number } }
    resolution: { type: number, description: "H3 resolution (default 7)" }
    style: { type: string, description: "Basemap (default 'voyager')" }
    opacity: { type: number, description: "Hex fill opacity (default 0.55)" }
---

## When to use
Compare an idealized straight line to its discretized H3 hex chain (e.g. sanity check before snapping a route).

## Example
```
h3_webmcp_widget_display({name: "h3-line", params: { from: {lat: 40.7,lng: -74.0}, to: {lat: 40.78,lng: -73.96}, resolution: 9 }})
```
