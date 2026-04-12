---
widget: line-chart
description: Line chart (time series or XY data as lines)
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
      description: "Curve type: linear, natural, step, basis, cardinal, monotone (default: natural)"
    colorScheme:
      type: string
---

## When to use
For time series, trends, and comparing multiple series over a continuous axis.

## How
1. Get time series from MCP
2. Call `d3_webmcp_widget_display({name: "line-chart", params: {series: [{label: "Revenue", points: [{x:1,y:10},{x:2,y:15},{x:3,y:12}]}], xLabel: "Month", yLabel: "Revenue ($K)"}})`

## Common errors
- Points must be sorted by x for line to render correctly
- Use `curve: "step"` for discrete data, `"natural"` for smooth trends
