---
widget: fixed-positions
description: Nodes placed at specific x/y coordinates provided in data
schema:
  type: object
  properties:
    elements:
      type: array
      description: Array of Cytoscape elements with position data
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
          position:
            type: object
            properties:
              x:
                type: number
              y:
                type: number
    layout:
      type: object
      description: Optional layout overrides
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Renders nodes at exact x/y positions specified in each element's `position` field. Uses the `preset` layout. Ideal for geographic overlays, floor plans, or any visualization requiring precise positioning.
