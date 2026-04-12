---
widget: arc-chart
description: Arc/gauge chart (progress arcs showing completion)
group: d3
schema:
  type: object
  required:
    - arcs
  properties:
    title:
      type: string
    arcs:
      type: array
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
          value:
            type: number
            description: "Current value (0 to max)"
          max:
            type: number
            description: "Maximum value (default: 1)"
          color:
            type: string
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
---

## When to use
For showing progress/completion of multiple KPIs in a compact gauge format (CPU usage, goal completion, health metrics).

## How
1. Get metric data from MCP
2. Call `d3_webmcp_widget_display('arc-chart', {arcs: [{label: "CPU", value: 0.72, max: 1}, {label: "Memory", value: 6.4, max: 8}]})`

## Common errors
- `value` should be between 0 and `max`; values are clamped
- Each arc is a half-circle; for full gauges use donut instead
