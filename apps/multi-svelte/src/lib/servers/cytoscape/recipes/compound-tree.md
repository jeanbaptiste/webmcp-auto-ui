---
widget: compound-tree
description: Hierarchical tree with compound (nested) nodes showing containment
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with parent references for nesting
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

Renders a hierarchical tree where nodes can contain other nodes (compound structure). Uses CoSE-Bilkent for layout. The `parent` field in node data defines containment relationships.
