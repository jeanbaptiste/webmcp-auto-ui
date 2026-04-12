---
widget: graph-force-fast
description: Fast force-directed layout using fCoSE for large graphs
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
      description: Optional layout overrides for fCoSE
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a force-directed graph using fCoSE (fast Compound Spring Embedder), optimized for large graphs with hundreds of nodes. Significantly faster than standard CoSE while maintaining quality.
