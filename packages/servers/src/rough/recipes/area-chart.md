---
widget: rough-area-chart
description: Filled area chart showing magnitude over time
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
      description: X-axis labels (e.g. months, dates)
    values:
      type: array
      items:
        type: number
      description: Numeric values for each point
    title:
      type: string
      description: Chart title
---

## Area Chart

Line chart with filled area beneath, using Rough.js hachure fill.

### Data format

- `labels` — x-axis labels
- `values` — numeric values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "area-chart", params: {labels: ["Jan","Feb","Mar","Apr"], values: [10,25,18,35], title: "Growth Trend"}})`

## Example
```
rough_webmcp_widget_display({name: "rough-area-chart", params: {labels: ["Jan","Feb","Mar","Apr","May","Jun"], values: [12,28,22,40,35,55], title: "Monthly Revenue"}})
```
