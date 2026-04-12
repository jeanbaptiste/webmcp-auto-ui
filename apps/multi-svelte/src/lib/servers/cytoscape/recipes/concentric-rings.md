---
widget: concentric-rings
description: Concentric circles layout based on node attributes (degree, weight, etc.)
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
              level:
                type: number
              source:
                type: string
              target:
                type: string
    layout:
      type: object
      description: Optional layout overrides (concentricBy, minNodeSpacing)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Places nodes in concentric rings based on a metric (degree centrality by default, or a custom `level` data field). Nodes with higher values are placed closer to the center. Set `layout.concentric` to customize ordering.
