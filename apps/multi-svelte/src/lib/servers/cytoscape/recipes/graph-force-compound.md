---
widget: graph-force-compound
description: Force-directed layout with compound (parent/child) node grouping
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with optional parent field for compound nodes
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
              parent:
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

Renders a force-directed graph with compound nodes (groups). Nodes with a `parent` field are visually nested inside the parent node. Uses the CoSE-Bilkent layout for better compound node handling.
