---
widget: h3-path
description: gridPathCells(start, end) — chain of hexagons connecting two cells
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
    opacity: { type: number, description: "Fill opacity (default 0.7)" }
---

## When to use
Visualize the discrete H3 cell sequence between two locations (good for ride-sharing, traversal, line-of-cells analysis).

## Example
```
h3_webmcp_widget_display({name: "h3-path", params: { from: {lat:48.85,lng:2.35}, to: {lat:48.88,lng:2.42}, resolution: 9 }})
```
