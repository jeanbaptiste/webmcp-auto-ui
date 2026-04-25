---
widget: rough-step-chart
description: Line chart with step transitions instead of diagonal lines
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
      description: X-axis labels
    values:
      type: array
      items:
        type: number
      description: Numeric values for each step
    title:
      type: string
      description: Chart title
---

## Step Chart

Step function chart — horizontal segments connected by vertical jumps.

### Data format

- `labels` — x-axis labels
- `values` — numeric values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "step-chart", params: {labels: ["Jan","Feb","Mar","Apr"], values: [10,10,25,25], title: "Pricing Tiers"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-step-chart", params: {labels: ["Jan","Feb","Mar","Apr","May"], values: [10,10,25,25,40], title: "Pricing Tiers"}})
```
