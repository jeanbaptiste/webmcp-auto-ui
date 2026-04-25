---
widget: canvas2d-network-graph
description: Network graph — force-directed node-link diagram
group: canvas2d
schema:
  type: object
  required: [nodes, edges]
  properties:
    title: { type: string }
    nodes:
      type: array
      items:
        type: object
        required: [id]
        properties:
          id: { type: string }
          label: { type: string }
          group: { type: number }
    edges:
      type: array
      items:
        type: object
        required: [source, target]
        properties:
          source: { type: string }
          target: { type: string }
---

## When to use
Show relationships between entities (social networks, dependencies, knowledge graphs).

## How
```
widget_display({name: "canvas2d-network-graph", params: {
  title: 'Team connections',
  nodes: [
    { id: 'a', label: 'Alice', group: 0 },
    { id: 'b', label: 'Bob', group: 0 },
    { id: 'c', label: 'Charlie', group: 1 }
  ],
  edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }]
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-network-graph", params: {title: "Team connections", nodes: [{id: "a", label: "Alice", group: 0}, {id: "b", label: "Bob", group: 0}, {id: "c", label: "Charlie", group: 1}], edges: [{source: "a", target: "b"}, {source: "b", target: "c"}]}})
```
