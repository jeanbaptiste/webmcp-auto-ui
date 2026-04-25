---
widget: pie
description: Pie chart (proportional slices in a circle)
group: d3
schema:
  type: object
  required:
    - slices
  properties:
    title:
      type: string
    slices:
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
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
---

## When to use
For showing part-to-whole relationships with few categories (3-7 ideal). Use donut for a cleaner look.

## How
1. Get category data from MCP
2. Call `d3_webmcp_widget_display({name: "pie", params: {slices: [{label: "A", value: 30}, {label: "B", value: 50}, {label: "C", value: 20}]}})`

## Common errors
- Too many slices (>7) make the chart unreadable; group small values into "Other"
- All values must be positive

## Example
```
d3_webmcp_widget_display({name: "pie", params: {title: "Market Share 2024", slices: [{label: "Chrome", value: 65}, {label: "Safari", value: 19}, {label: "Firefox", value: 4}, {label: "Edge", value: 4}, {label: "Other", value: 8}]}})
```
