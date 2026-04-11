---
widget: radial-bar
description: Radial bar chart (bars arranged in a circle)
group: d3
schema:
  type: object
  required:
    - bars
  properties:
    title:
      type: string
    bars:
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
          color:
            type: string
      description: "Array of bars with label and value"
    innerRadius:
      type: number
      description: "Inner radius ratio 0-1 (default: 0.3)"
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
---

## When to use
For categorical data displayed in a circular layout (monthly data, survey responses, comparative metrics). More visually striking than a standard bar chart.

## How
1. Get categorical data from MCP
2. Call `d3_webmcp_widget_display('radial-bar', {bars: [{label:"Jan",value:30},{label:"Feb",value:45},{label:"Mar",value:28},{label:"Apr",value:60}]})`

## Common errors
- All values must be non-negative
- Too many bars (>30) makes labels unreadable; group or truncate data
- Do not use for precise comparisons; human perception of arc length is less accurate than linear length
