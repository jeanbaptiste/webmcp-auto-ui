---
widget: chartjs-line
description: Line chart — display trends and time series data with connected data points
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: X-axis labels (categories or time points)
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
          borderColor:
            type: string
          backgroundColor:
            type: string
          fill:
            type: boolean
      description: Array of dataset objects with label, data, and optional styling
    values:
      type: array
      items:
        type: number
      description: Shorthand — single dataset values (used when datasets is omitted)
    label:
      type: string
      description: Shorthand — single dataset label (used with values)
    options:
      type: object
      description: Chart.js options object (scales, plugins, etc.)
  required:
    - labels
---

## When to use

Use chartjs-line when data represents a trend over time or ordered categories. Ideal for:
- Time series (temperature, stock prices, metrics over days/months)
- Comparing multiple series on the same axis
- Showing growth or decline patterns

## How

1. Call `chartjs_webmcp_widget_display({name: "chartjs-line", params: {labels: ["Jan", "Feb", "Mar", "Apr", "May"], values: [10, 25, 15, 30, 22], label: "Revenue (k€)"}})`

## Examples

### Single series
```json
{
  "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
  "values": [10, 25, 15, 30, 22],
  "label": "Revenue (k€)"
}
```

### Multiple series
```json
{
  "labels": ["Q1", "Q2", "Q3", "Q4"],
  "datasets": [
    {"label": "2024", "data": [100, 120, 115, 140], "borderColor": "#3b82f6"},
    {"label": "2025", "data": [110, 135, 128, 155], "borderColor": "#10b981"}
  ]
}
```
