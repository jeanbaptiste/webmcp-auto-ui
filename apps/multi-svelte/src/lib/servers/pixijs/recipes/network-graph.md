---
widget: pixijs-network-graph
description: Force-directed network graph with animated physics simulation
schema:
  type: object
  properties:
    nodes:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
          label:
            type: string
          color:
            type: string
      description: Graph nodes
    edges:
      type: array
      items:
        type: object
        properties:
          source:
            type: string
          target:
            type: string
      description: Edges connecting node ids
    title:
      type: string
  required:
    - nodes
    - edges
---

## When to use

Use pixijs-network-graph for animated force-directed layouts. Ideal for:
- Social networks
- Dependency graphs
- Any relational data

## Examples

```json
{
  "nodes": [
    {"id": "a", "label": "Alice"},
    {"id": "b", "label": "Bob"},
    {"id": "c", "label": "Carol"}
  ],
  "edges": [
    {"source": "a", "target": "b"},
    {"source": "b", "target": "c"},
    {"source": "a", "target": "c"}
  ]
}
```
