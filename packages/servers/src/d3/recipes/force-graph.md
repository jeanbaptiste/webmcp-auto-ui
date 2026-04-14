---
widget: force-graph
description: Force-directed graph (nodes and links with physics simulation)
group: d3
schema:
  type: object
  required:
    - nodes
    - links
  properties:
    title:
      type: string
    nodes:
      type: array
      items:
        type: object
        required:
          - id
        properties:
          id:
            type: string
          label:
            type: string
          group:
            type: number
          radius:
            type: number
    links:
      type: array
      items:
        type: object
        required:
          - source
          - target
        properties:
          source:
            type: string
          target:
            type: string
          value:
            type: number
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
---

## When to use
For relationship networks (social graphs, dependency trees, knowledge graphs). Nodes are pulled together by links and pushed apart by charge.

## How
1. Get graph data from MCP
2. Call `d3_webmcp_widget_display({name: "force-graph", params: {nodes: [{id:"a",label:"Alice",group:1},{id:"b",label:"Bob",group:2}], links: [{source:"a",target:"b",value:3}]}})`

## Common errors
- `source` and `target` in links must match node `id` values
- Nodes support drag interaction
- `group` is used for coloring; nodes in the same group share a color
