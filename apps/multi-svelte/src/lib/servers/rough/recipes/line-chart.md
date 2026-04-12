---
widget: rough-line-chart
description: Single line chart showing trend over time
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
      description: X-axis labels (e.g. dates, categories)
    values:
      type: array
      items:
        type: number
      description: Numeric values for each point
    title:
      type: string
      description: Chart title
---

## Line Chart

A single-series line chart with sketchy connectors and dots.

### Data format

- `labels` — x-axis labels (e.g., dates, categories)
- `values` — numeric values
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "line-chart", params: {labels: ["Mon","Tue","Wed","Thu","Fri"], values: [12,19,15,25,22], title: "Weekly Visitors"}})`
