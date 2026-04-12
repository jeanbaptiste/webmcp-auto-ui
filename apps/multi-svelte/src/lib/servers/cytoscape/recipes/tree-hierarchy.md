---
widget: tree-hierarchy
description: Hierarchical tree layout with top-to-bottom or left-to-right orientation
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements forming a tree structure
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
      description: Optional layout overrides (e.g. direction)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders a hierarchical tree using the Dagre layout engine. Ideal for org charts, file trees, and any parent-child relationships. Set `layout.rankDir` to 'TB' (top-bottom) or 'LR' (left-right).
