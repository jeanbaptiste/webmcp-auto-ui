---
widget: pagerank-graph
description: Graph with node sizes scaled by PageRank algorithm
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

Computes PageRank on the graph and scales node sizes proportionally to their PageRank score. Higher-ranked nodes appear larger. Uses Cytoscape's built-in `pageRank()` algorithm.
