---
widget: voronoi
description: Voronoi tessellation diagram (partition space by nearest point)
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
        type: object
        required:
          - x
          - y
        properties:
          x:
            type: number
          y:
            type: number
          label:
            type: string
          value:
            type: number
      description: "Array of points with x, y coordinates and optional label/value"
    showPoints:
      type: boolean
      description: "Show point markers (default: true)"
    showLabels:
      type: boolean
      description: "Show point labels (default: true)"
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
---

## When to use
For spatial partitioning, nearest-neighbor visualization, territory maps, or cell-based diagrams.

## How
1. Get point data from MCP
2. Call `d3_webmcp_widget_display('voronoi', {points: [{x:50,y:50,label:"HQ"},{x:200,y:100,label:"Branch A"},{x:150,y:250,label:"Branch B"}]})`

## Common errors
- Each point must have `x` and `y` numeric properties
- Overlapping points (same x,y) will cause degenerate cells
- Labels appear at point positions; for dense data, set showLabels to false
