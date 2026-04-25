---
widget: deckgl-arc
description: Curved arcs between geo-points (great for flows, migrations, OD pairs). 3D when pitched.
group: deckgl
schema:
  type: object
  required: [arcs]
  properties:
    arcs: { type: array, description: "Array of {from: [lng,lat], to: [lng,lat], sourceColor?, targetColor?, width?, height?}" }
    center: { type: array }
    zoom: { type: number }
    style: { type: string }
    pitch: { type: number, description: "Default 30" }
    greatCircle: { type: boolean, description: "Use great-circle arcs" }
---

## When to use
Migration, trade flows, network connections, origin-destination pairs.

## Example
```
deckgl_webmcp_widget_display({name: "deckgl-arc", params: {
  arcs: [{from:[-74,40.7], to:[2.35,48.85], width:3}],
  center: [-30, 45], zoom: 3, pitch: 30, greatCircle: true
}})
```
