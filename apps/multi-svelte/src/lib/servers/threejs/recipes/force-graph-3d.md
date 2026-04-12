---
widget: force-graph-3d
description: 3D force-directed graph. Networks, relationships, graph data.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    nodes:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
          color:
            type: string
          label:
            type: string
    links:
      type: array
      items:
        type: object
        required: [source, target]
        properties:
          source:
            type: number
            description: Node index
          target:
            type: number
            description: Node index
    nodeSize:
      type: number
    linkColor:
      type: string
---

## When to use

Visualize network graphs, social networks, dependency trees in 3D space.

## How

```
widget_display('force-graph-3d', {
  title: "Network",
  nodes: [
    { id: "A", color: "#ff4444" },
    { id: "B", color: "#44ff44" },
    { id: "C", color: "#4444ff" }
  ],
  links: [
    { source: 0, target: 1 },
    { source: 1, target: 2 },
    { source: 0, target: 2 }
  ]
})
```
