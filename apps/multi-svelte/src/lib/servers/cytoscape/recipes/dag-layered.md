---
widget: dag-layered
description: Layered DAG layout with rank-based node positioning
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements forming a layered DAG
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
      description: Optional layout overrides (rankSep, nodeSep, etc.)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a layered DAG using the Dagre layout with emphasis on minimizing edge crossings. Nodes are assigned to ranks (layers) based on their depth in the graph. Great for compiler IR visualization, scheduling graphs, etc.
