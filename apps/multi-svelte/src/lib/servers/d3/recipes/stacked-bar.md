---
widget: stacked-bar
description: Stacked bar chart (categories with stacked segments)
group: d3
schema:
  type: object
  required:
    - categories
    - series
  properties:
    title:
      type: string
    categories:
      type: array
      items:
        type: string
      description: "Category labels for each bar group"
    series:
      type: array
      items:
        type: object
        required:
          - label
          - values
        properties:
          label:
            type: string
          values:
            type: array
            items:
              type: number
    xLabel:
      type: string
    yLabel:
      type: string
    horizontal:
      type: boolean
      description: "Render horizontal bars (default: false)"
    colorScheme:
      type: string
---

## When to use
For comparing totals and their composition across discrete categories (revenue by quarter by product, survey responses).

## How
1. Get categorical data from MCP
2. Call `d3_webmcp_widget_display('stacked-bar', {categories: ["Q1","Q2","Q3"], series: [{label: "Product A", values: [10,15,12]}, {label: "Product B", values: [5,8,9]}]})`

## Common errors
- Each series.values must have the same length as categories
- All values must be non-negative
- Set `horizontal: true` for long category labels
