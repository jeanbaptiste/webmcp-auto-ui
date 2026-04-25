---
widget: voronoi
description: Voronoi tessellation (space partitioned by nearest point)
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
    showPoints:
      type: boolean
      description: "Show point markers (default: true)"
    showLabels:
      type: boolean
      description: "Show point labels (default: true)"
    colorScheme:
      type: string
---

## When to use
For geographic influence zones, nearest-neighbor visualization, or artistic space partitioning.

## How
1. Get point data from MCP
2. Call `d3_webmcp_widget_display({name: "voronoi", params: {points: [{x:10,y:20,label:"A"},{x:50,y:60,label:"B"},{x:80,y:30,label:"C"}]}})`

## Common errors
- Need at least 3 points to form meaningful cells
- Points at identical coordinates will cause degenerate cells

## Example
```
d3_webmcp_widget_display({name: "voronoi", params: {title: "Service Area Zones", points: [{x:15,y:25,label:"Depot A",value:120},{x:60,y:70,label:"Depot B",value:95},{x:85,y:20,label:"Depot C",value:140},{x:35,y:80,label:"Depot D",value:75},{x:70,y:45,label:"Depot E",value:110}]}})
```
