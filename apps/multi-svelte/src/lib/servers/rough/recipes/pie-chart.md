---
widget: rough-pie-chart
description: Circular chart showing proportions of a whole
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
      description: Slice labels
    values:
      type: array
      items:
        type: number
      description: Numeric values (proportions)
    title:
      type: string
      description: Chart title
---

## Pie Chart

Classic pie chart with hand-drawn arcs and hachure fills.

### Data format

- `labels` — slice labels
- `values` — numeric values (proportions)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "pie-chart", params: {labels: ["Desktop","Mobile","Tablet"], values: [55,35,10], title: "Device Usage"}})`
