---
widget: graph-force
description: Force-directed graph layout using the default Cose algorithm
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements (nodes and edges)
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

Renders a force-directed graph using Cytoscape's built-in CoSE (Compound Spring Embedder) layout. Nodes repel each other while edges act as springs, producing an organic-looking layout.

Provide `elements` as an array of node/edge objects with `data` fields. Edges reference nodes via `source` and `target`.
