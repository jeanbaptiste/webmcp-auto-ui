---
widget: plotly-sankey
description: Sankey diagram — flow between nodes with proportional link width.
group: plotly
schema:
  type: object
  required: [nodes, links]
  properties:
    title: { type: string, description: Chart title }
    nodes:
      type: object
      required: [label]
      properties:
        label: { type: array, items: { type: string }, description: Node names }
        color: { type: array, items: { type: string }, description: Node colors }
    links:
      type: object
      required: [source, target, value]
      properties:
        source: { type: array, items: { type: integer }, description: Source node indices }
        target: { type: array, items: { type: integer }, description: Target node indices }
        value: { type: array, items: { type: number }, description: Flow values }
        color: { type: array, items: { type: string }, description: Link colors }
---

## When to use
Visualize flows between categories (energy, money, materials, users).

## Example
```
plotly_webmcp_widget_display({name: "plotly-sankey", params: { nodes: { label: ['A','B','C','D'] }, links: { source: [0,0,1,2], target: [1,2,3,3], value: [8,4,6,3] } }})
```
