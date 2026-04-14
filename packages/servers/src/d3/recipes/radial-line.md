---
widget: radial-line
description: Radial line chart (radar/spider chart with lines)
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
                - value
              properties:
                value:
                  type: number
    labels:
      type: array
      items:
        type: string
      description: "Axis labels (one per point)"
    colorScheme:
      type: string
---

## When to use
For comparing multiple entities across several dimensions (skill radar, product comparison, performance metrics).

## How
1. Get multi-dimensional data from MCP
2. Call `d3_webmcp_widget_display({name: "radial-line", params: {labels: ["Speed","Power","Range","Efficiency"], series: [{label: "Model A", points: [{value:8},{value:6},{value:9},{value:7}]}]}})`

## Common errors
- All series must have the same number of points (matching labels length)
- Values should be on a comparable scale (normalize if needed)
