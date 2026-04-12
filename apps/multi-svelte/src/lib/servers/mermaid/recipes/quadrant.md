---
widget: mermaid-quadrant
description: Quadrant chart for plotting items on two axes (e.g. priority vs effort).
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid quadrant chart definition"
    title:
      type: string
    xAxis:
      type: object
      properties:
        left:
          type: string
        right:
          type: string
    yAxis:
      type: object
      properties:
        bottom:
          type: string
        top:
          type: string
    quadrants:
      type: array
      items:
        type: string
      description: "Labels for quadrants 1-4 (top-right, top-left, bottom-left, bottom-right)"
    points:
      type: array
      items:
        type: object
        required: [label, x, y]
        properties:
          label:
            type: string
          x:
            type: number
            description: "0.0 to 1.0"
          y:
            type: number
            description: "0.0 to 1.0"
---
Renders a quadrant chart. Provide either a raw `definition` or structured axes, quadrant labels, and data points with x/y coordinates (0-1).
