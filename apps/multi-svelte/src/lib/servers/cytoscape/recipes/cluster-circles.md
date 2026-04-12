---
widget: cluster-circles
description: Nodes clustered into circular groups based on a grouping attribute
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with group data
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
              group:
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

Groups nodes into clusters based on a `group` data attribute, then arranges each cluster in a circular pattern. Uses the CoSE layout with compound nodes to visually separate clusters.
