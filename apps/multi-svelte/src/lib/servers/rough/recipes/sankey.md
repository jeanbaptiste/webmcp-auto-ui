---
widget: rough-sankey
description: Flow diagram showing quantities between nodes
schema:
  type: object
  required:
    - nodes
    - links
  properties:
    nodes:
      type: array
      items:
        type: string
      description: Node names
    links:
      type: array
      items:
        type: object
        required:
          - source
          - target
          - value
        properties:
          source:
            type: number
            description: Source node index
          target:
            type: number
            description: Target node index
          value:
            type: number
            description: Flow quantity
      description: Weighted links between nodes
    title:
      type: string
      description: Chart title
---

## Sankey Diagram

Weighted flow between source and target nodes.

### Data format

- `nodes` — array of node names (strings)
- `links` — array of `{source, target, value}` objects (indices into nodes)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "sankey", params: {nodes: ["Budget","Marketing","Engineering"], links: [{source: 0, target: 1, value: 40}, {source: 0, target: 2, value: 50}], title: "Budget Allocation"}})`
