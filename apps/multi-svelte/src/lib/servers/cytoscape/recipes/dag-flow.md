---
widget: dag-flow
description: Directed acyclic graph with top-to-bottom flow layout
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements forming a DAG
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

Renders a directed acyclic graph (DAG) with a top-to-bottom flow using the Dagre layout. Perfect for workflow diagrams, pipelines, and dependency graphs where direction matters.
