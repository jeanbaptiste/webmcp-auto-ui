---
widget: chartjs-doughnut
description: Doughnut chart — proportions displayed as a ring with an empty center
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: Label for each segment
    datasets:
      type: array
      items:
        type: object
        properties:
          data:
            type: array
            items:
              type: number
          backgroundColor:
            type: array
            items:
              type: string
      description: Dataset with data values and optional colors
    values:
      type: array
      items:
        type: number
      description: Shorthand — segment values
    label:
      type: string
      description: Dataset label
    options:
      type: object
      description: Chart.js options object
  required:
    - labels
---

## When to use

Use chartjs-doughnut like a pie chart but when you want the center area for additional context (e.g., total value as text). Ideal for:
- Progress indicators
- Category breakdowns with a summary metric in the center
- Dashboard KPI widgets

## How

1. Call `chartjs_webmcp_widget_display({name: "chartjs-doughnut", params: {labels: ["Rent", "Food", "Transport", "Entertainment", "Savings"], values: [35, 25, 15, 10, 15]}})`

## Examples

### Expense breakdown
```json
{
  "labels": ["Rent", "Food", "Transport", "Entertainment", "Savings"],
  "values": [35, 25, 15, 10, 15]
}
```
