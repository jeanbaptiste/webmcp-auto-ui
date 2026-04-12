---
widget: animated-flow
description: Graph with animated edges showing directional data flow
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
              flow:
                type: number
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a graph with animated dashed edges that show the direction of flow. Edge width can be scaled by a `flow` data attribute. The animation creates a "marching ants" effect along edges.
