---
widget: nivo-network
description: Force-directed network graph with nodes and links.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data:
      type: object
      description: "{ nodes: [{id, color?, size?}], links: [{source, target, distance?}] }"
    linkDistance: { type: number, description: Link target distance (default 50) }
    centeringStrength: { type: number, description: Centering force (default 0.3) }
    repulsivity: { type: number, description: Node repulsion (default 6) }
    nodeSize: { type: number, description: Default node size (default 12) }
---

## When to use
Small to medium networks with interactive force layout.

## Example
```
nivo_webmcp_widget_display({name: "nivo-network", params: { data: { nodes:[{id:'A'},{id:'B'},{id:'C'}], links:[{source:'A', target:'B'},{source:'B', target:'C'}] } }})
```
