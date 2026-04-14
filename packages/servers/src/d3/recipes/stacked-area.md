---
widget: stacked-area
description: Stacked area chart (multiple series stacked)
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
          - label
          - points
        properties:
          label:
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
    colorScheme:
      type: string
---

## When to use
For showing how multiple categories contribute to a total over time (market share evolution, traffic sources, revenue by product).

## How
1. Get multi-series data from MCP (all series must share the same x values)
2. Call `d3_webmcp_widget_display({name: "stacked-area", params: {series: [{label: "Organic", points: [{x:1,y:10},{x:2,y:15}]}, {label: "Paid", points: [{x:1,y:5},{x:2,y:8}]}]}})`

## Common errors
- All series MUST have the same x values (same length, same positions)
- Values must be non-negative
