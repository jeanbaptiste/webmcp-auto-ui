---
widget: chart-rich
description: Advanced multi-type chart (bar, line, area, pie)
group: rich
schema:
  type: object
  required:
    - data
  properties:
    title:
      type: string
    type:
      type: string
      enum:
        - bar
        - line
        - area
        - pie
        - donut
    labels:
      type: array
      items:
        type: string
    data:
      type: array
      items:
        type: object
        required:
          - values
        properties:
          label:
            type: string
          values:
            type: array
            items:
              type: number
          color:
            type: string
---

## When to use
For multi-series charts or types other than simple bars (lines, areas, pies, donuts). Prefer `chart` for a basic single-series bar chart.

## How to use
1. Fetch data via MCP
2. Structure into series with `labels` (X axis) and `data` (value series)
3. Call `autoui_webmcp_widget_display('chart-rich', { title: 'Monthly Trend', type: 'line', labels: ['Jan', 'Feb', 'Mar'], data: [{ label: '2024', values: [10, 20, 15], color: '#4CAF50' }] })`

## Common mistakes
- The number of `values` in each series must match the number of `labels`
- Do not confuse with `chart` (simple widget) — `chart-rich` uses a different data format
