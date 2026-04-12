---
widget: physics-simulation
description: Continuous physics-based simulation with interactive dragging
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
              mass:
                type: number
              source:
                type: string
              target:
                type: string
    layout:
      type: object
      description: Optional physics parameters (gravity, nodeRepulsion, edgeElasticity)
    style:
      type: array
      description: Optional Cytoscape style array
  required: [elements]
---

## Usage

Runs a continuous physics simulation where nodes can be dragged and the layout re-stabilizes in real time. Uses CoSE with `animate: true` and `infinite: true` for ongoing simulation.
