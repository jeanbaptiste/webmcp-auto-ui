---
widget: chartjs-pie
description: Pie chart — show proportions of a whole as circular slices
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: Label for each slice
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
      description: Shorthand — slice values
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

Use chartjs-pie when showing how parts make up a whole. Ideal for:
- Market share breakdowns
- Budget allocations
- Category distributions (limited to 6-8 slices max for readability)

## How

1. Provide `labels` for each slice
2. Provide `values` or `datasets` with proportional data
3. Colors are auto-assigned if not provided

## Examples

### Market share
```json
{
  "labels": ["Chrome", "Safari", "Firefox", "Edge", "Other"],
  "values": [65, 18, 7, 5, 5]
}
```
