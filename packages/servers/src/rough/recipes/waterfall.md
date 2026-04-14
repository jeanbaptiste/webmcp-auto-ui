---
widget: rough-waterfall
description: Shows cumulative effect of sequential positive/negative values
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
      description: Step labels
    values:
      type: array
      items:
        type: number
      description: Incremental values (positive adds, negative subtracts)
    title:
      type: string
      description: Chart title
---

## Waterfall Chart

Sequential bars showing how an initial value is modified by increments.

### Data format

- `labels` — step labels
- `values` — incremental values (positive adds, negative subtracts)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "waterfall", params: {labels: ["Start","Sales","Returns","Costs","Net"], values: [100,60,-20,-40,0], title: "Profit Breakdown"}})`
