---
widget: chart
description: Simple bar chart
group: simple
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
        type: array
        items:
          - type: string
          - type: number
        minItems: 2
        maxItems: 2
---

## When to use
Use for a quick bar chart with simple categorical data. Prefer `chart-rich` for multi-series charts, line charts, or pie charts.

## How to use
1. Fetch the data via MCP (e.g. counts by category)
2. Format as an array of `[label, value]` pairs
3. Call `autoui_webmcp_widget_display('chart', { title: 'Sales by region', bars: [['North', 150], ['South', 230], ['East', 180]] })`

## Common mistakes
- Swapping label and value in pairs — the format is `[string, number]`, not `[number, string]`
