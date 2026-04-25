---
widget: density-map
description: Density heatmap (2D binning as colored grid)
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
    binsX:
      type: number
      description: "Number of horizontal bins (default: 30)"
    binsY:
      type: number
      description: "Number of vertical bins (default: 30)"
    colorScheme:
      type: string
      description: "Sequential color scheme name (default: YlOrRd)"
---

## When to use
For showing hot spots in 2D data as a pixelated heatmap. Faster and simpler than contour for large point clouds.

## How
1. Get 2D point data from MCP
2. Call `d3_webmcp_widget_display({name: "density-map", params: {points: [[1,2],[1.1,2.1],[5,6],[5.2,5.8]], binsX: 20, binsY: 20}})`

## Common errors
- Points are `[x, y]` arrays
- Too many bins with few points creates sparse/empty grids
- Too few bins loses detail

## Example
```
d3_webmcp_widget_display({name: "density-map", params: {title: "Event Hotspots", points: [[1.1,2.0],[1.2,2.1],[1.0,1.9],[1.3,2.2],[1.1,2.0],[5.5,6.0],[5.6,5.9],[5.4,6.1],[5.5,6.2],[5.7,5.8],[3.0,8.0],[3.1,7.9],[2.9,8.1]], binsX: 20, binsY: 20, colorScheme: "YlOrRd"}})
```
