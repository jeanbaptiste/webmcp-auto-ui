---
widget: rough-donut-chart
description: Pie chart with hollow center showing total
schema:
  type: object
  required:
    - labels
    - values
  properties:
    labels:
      type: array
      items:
        type: string
      description: Segment labels
    values:
      type: array
      items:
        type: number
      description: Numeric values for each segment
    title:
      type: string
      description: Chart title
---

## Donut Chart

Pie chart with a hole in the center, displaying the total sum.

### Data format

- `labels` — segment labels
- `values` — numeric values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "donut-chart", params: {labels: ["Rent","Food","Transport"], values: [1200,400,200], title: "Monthly Budget"}})`
