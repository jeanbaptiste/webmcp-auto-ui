---
widget: deckgl-h3-cluster
description: Render unioned regions of H3 hexagons (clusters of cells).
group: deckgl
schema:
  type: object
  required: [clusters]
  properties:
    clusters: { type: array, description: "Array of {hexagons: [H3-index,...], color?}" }
    fillColor: { description: "Fallback color" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
---

## When to use
Group multiple H3 cells into a region (district, service area).

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-h3-cluster", params: {
  clusters: [{hexagons: ["8928308280fffff","89283082807ffff"], color:"#9b59b6"}],
  center: [-122.4, 37.78], zoom: 10
}})
```
