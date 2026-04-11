---
widget: contour
description: Contour density plot (2D kernel density estimation)
group: d3
schema:
  type: object
  required:
    - points
  properties:
    title:
      type: string
    points:
      type: array
      items:
        type: array
        items:
          type: number
        minItems: 2
        maxItems: 2
      description: "Array of [x, y] coordinate pairs"
    bandwidth:
      type: number
      description: "Kernel bandwidth (default: 20)"
    thresholds:
      type: number
      description: "Number of contour levels (default: 10)"
    colorScheme:
      type: string
      description: "D3 sequential color scheme (default: Blues)"
---

## When to use
For visualizing the density distribution of 2D point data (spatial clustering, scatter density, geographic hotspots).

## How
1. Get 2D point data from MCP
2. Call `d3_webmcp_widget_display('contour', {points: [[10,20],[15,25],[12,22],[80,70],[85,75]], thresholds: 8})`

## Common errors
- Points must be [x, y] pairs (arrays of exactly 2 numbers)
- Too few points (<10) will produce meaningless contours
- Bandwidth controls smoothing: higher = smoother, lower = more detail
