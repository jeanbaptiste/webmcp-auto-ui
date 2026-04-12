---
widget: timeline-graph
description: Graph with nodes positioned along a horizontal timeline axis
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with time data
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
              time:
                type: number
                description: Numeric time value for x-axis positioning
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

Positions nodes along a horizontal timeline based on their `time` data value. Edges show dependencies or relationships across time. Uses a preset layout with x-positions derived from time values and y-positions from a force simulation.
