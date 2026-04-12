---
widget: centrality-map
description: Graph with nodes colored by betweenness centrality score
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements
      items:
        type: object
        properties:
          data:
            type: object
            properties:
              id:
                type: string
              label:
                type: string
              source:
                type: string
              target:
                type: string
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Computes betweenness centrality for all nodes and maps the values to a color gradient (cold to hot). Nodes that act as bridges between communities appear in warmer colors. Uses Cytoscape's built-in `betweennessCentrality()`.
