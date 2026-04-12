---
widget: delaunay
description: Delaunay triangulation (triangulate a set of points)
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
    showPoints:
      type: boolean
      description: "Show point markers (default: true)"
    colorScheme:
      type: string
---

## When to use
For mesh generation visualization, computational geometry, or connecting scattered points into a triangular mesh.

## How
1. Get point data from MCP
2. Call `d3_webmcp_widget_display({name: "delaunay", params: {points: [{x:10,y:20},{x:50,y:60},{x:80,y:30},{x:40,y:80}]}})`

## Common errors
- Need at least 3 non-collinear points
- Collinear points produce degenerate triangulations
