---
widget: scatter-voronoi
description: Scatter plot with Voronoi-based hover detection
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
          color:
            type: string
          group:
            type: number
          radius:
            type: number
    xLabel:
      type: string
    yLabel:
      type: string
    showVoronoi:
      type: boolean
      description: "Show Voronoi cell edges for debugging (default: false)"
    colorScheme:
      type: string
---

## When to use
For scatter plots with many points where precise hover detection matters. Voronoi cells ensure the nearest point is always highlighted, even in dense regions.

## How
1. Get scatter data from MCP
2. Call `d3_webmcp_widget_display('scatter-voronoi', {points: [{x:1,y:2,label:"A"},{x:3,y:5,label:"B"},{x:2,y:3,label:"C"}], xLabel: "Height", yLabel: "Weight"})`

## Common errors
- Works best with >10 points
- `showVoronoi: true` is useful for debugging but clutters the visualization
- For few points, a regular scatter plot suffices
