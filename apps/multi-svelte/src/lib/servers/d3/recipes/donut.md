---
widget: donut
description: Donut chart (pie with a hole, optional center text)
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
    centerText:
      type: string
      description: "Text displayed in the center of the donut"
    innerRadiusRatio:
      type: number
      description: "Inner radius as ratio of outer radius (default: 0.55)"
    colorScheme:
      type: string
      description: "D3 color scheme name (default: Tableau10)"
---

## When to use
Like pie but cleaner, with space in the center for a summary stat (total, percentage, label).

## How
1. Get category data from MCP
2. Call `d3_webmcp_widget_display({name: "donut", params: {slices: [{label: "Active", value: 75}, {label: "Inactive", value: 25}], centerText: "75%"}})`

## Common errors
- Same as pie: keep slices under 7, all values positive
- centerText is optional; use it for the most important stat
