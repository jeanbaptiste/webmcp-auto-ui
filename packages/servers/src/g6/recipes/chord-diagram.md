---
widget: g6-chord-diagram
description: Chord-style diagram — nodes on a circle, curved chords showing relationships.
group: g6
schema:
  type: object
  required: [nodes, edges]
  properties:
    nodes: { type: array }
    edges: { type: array }
    radius: { type: number, description: "Outer radius (default 200)" }
    curveOffset: { type: number, description: "Chord curvature toward center (default 40)" }
---

## When to use
Pairwise flows between a small set of categories (trade flows, migration, contributions).

## Example
```
g6_webmcp_widget_display({name: "g6-chord-diagram", params: {
  nodes:[{id:"FR"},{id:"DE"},{id:"IT"},{id:"ES"}],
  edges:[{source:"FR",target:"DE"},{source:"DE",target:"IT"},{source:"FR",target:"ES"},{source:"IT",target:"ES"}]
}})
```
