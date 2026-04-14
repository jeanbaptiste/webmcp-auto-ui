---
widget: chartjs-bar
description: Bar chart — compare discrete categories with vertical or horizontal bars
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: Category labels for each bar group
    datasets:
      type: array
      items:
        type: object
        properties:
          label:
            type: string
          data:
            type: array
            items:
              type: number
          backgroundColor:
            type: string
      description: Array of dataset objects
    values:
      type: array
      items:
        type: number
      description: Shorthand — single dataset values
    label:
      type: string
      description: Shorthand — single dataset label
    options:
      type: object
      description: Chart.js options object
  required:
    - labels
---

## When to use

Use chartjs-bar for comparing quantities across categories. Ideal for:
- Comparing values between groups (countries, products, teams)
- Showing rankings or distributions
- Stacked comparisons with multiple datasets

## How

1. Call `chartjs_webmcp_widget_display({name: "chartjs-bar", params: {labels: ["Paris", "London", "Berlin", "Madrid"], values: [2.1, 8.9, 3.6, 3.2], label: "Population (M)"}})`

## Examples

### Simple bar chart
```json
{
  "labels": ["Paris", "London", "Berlin", "Madrid"],
  "values": [2.1, 8.9, 3.6, 3.2],
  "label": "Population (M)"
}
```

### Grouped bars
```json
{
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "datasets": [
    {"label": "Product A", "data": [50, 60, 70, 80], "backgroundColor": "#3b82f6"},
    {"label": "Product B", "data": [40, 55, 45, 65], "backgroundColor": "#f59e0b"}
  ]
}
```
