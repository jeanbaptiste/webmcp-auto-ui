---
widget: rough-multi-line
description: Multiple line series on the same axes for comparison
schema:
  type: object
  required:
    - labels
    - series
  properties:
    labels:
      type: array
      items:
        type: string
      description: Shared x-axis labels
    series:
      type: array
      items:
        type: object
        required:
          - name
          - values
        properties:
          name:
            type: string
            description: Series name
          values:
            type: array
            items:
              type: number
            description: Values for each label
      description: Line series to plot
    title:
      type: string
      description: Chart title
---

## Multi-Line Chart

Compare multiple trends on a shared axis.

### Data format

- `labels` — shared x-axis labels
- `series` — array of `{name, values}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "multi-line", params: {labels: ["Q1","Q2","Q3","Q4"], series: [{name: "Revenue", values: [100,150,130,200]}, {name: "Costs", values: [80,90,110,120]}], title: "Revenue vs Costs"}})`
