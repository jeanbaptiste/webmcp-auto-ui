---
widget: rough-bar-chart
description: Vertical bar chart with sketchy hand-drawn style
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
      description: Category labels for each bar
    values:
      type: array
      items:
        type: number
      description: Numeric values for each bar
    title:
      type: string
      description: Chart title
    colors:
      type: array
      items:
        type: string
      description: Custom color palette (hex)
---

## Bar Chart

A simple vertical bar chart rendered with Rough.js hand-drawn style.

### Data format

- `labels` — array of category labels
- `values` — array of numeric values (same length as labels)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "bar-chart", params: {labels: ["Q1","Q2","Q3","Q4"], values: [120,200,150,280], title: "Quarterly Revenue"}})`
