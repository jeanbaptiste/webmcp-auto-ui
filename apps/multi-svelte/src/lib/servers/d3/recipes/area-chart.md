---
widget: area-chart
description: Area chart (filled area under a line)
group: d3
schema:
  type: object
  required:
    - series
  properties:
    title:
      type: string
    series:
      type: array
      items:
        type: object
        required:
          - points
        properties:
          label:
            type: string
          color:
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
    xLabel:
      type: string
    yLabel:
      type: string
    curve:
      type: string
      description: "Curve type: linear, natural, step, basis, monotone (default: natural)"
    colorScheme:
      type: string
---

## When to use
Like line chart but emphasizes volume/magnitude below the line. Good for showing cumulative values, resource usage over time.

## How
1. Get time series from MCP
2. Call `d3_webmcp_widget_display({name: "area-chart", params: {series: [{label: "Traffic", points: [{x:0,y:100},{x:1,y:250},{x:2,y:180}]}]}})`

## Common errors
- Y-axis starts at 0 (unlike line chart which auto-scales)
- Multiple overlapping areas can be hard to read; use stacked-area instead
