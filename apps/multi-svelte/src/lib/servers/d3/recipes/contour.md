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
        description: "[x, y] coordinate pair"
        minItems: 2
        maxItems: 2
        items:
          type: number
    bandwidth:
      type: number
      description: "Kernel bandwidth (default: 20)"
    thresholds:
      type: number
      description: "Number of contour levels (default: 10)"
    colorScheme:
      type: string
      description: "Sequential color scheme name (default: Blues)"
---

## When to use
For showing density/concentration of scattered 2D data (event hotspots, population density, bivariate distribution).

## How
1. Get 2D point data from MCP
2. Call `d3_webmcp_widget_display('contour', {points: [[10,20],[12,22],[11,19],[50,60],[52,58]], bandwidth: 15})`

## Common errors
- Points are `[x, y]` arrays, not objects
- Bandwidth controls smoothness: smaller = more detail, larger = smoother
- Need enough points (>20) for meaningful density estimation
