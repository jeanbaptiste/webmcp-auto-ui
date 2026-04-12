---
widget: rough-radar-chart
description: Spider/radar chart showing multivariate data on radial axes
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
      description: Axis names
    values:
      type: array
      items:
        type: number
      description: Values per axis
    max:
      type: number
      description: Maximum scale value (defaults to max of values)
    title:
      type: string
      description: Chart title
---

## Radar Chart

Polygon on radial axes, ideal for comparing multiple attributes.

### Data format

- `labels` — axis names
- `values` — values per axis
- `max` — maximum scale value (optional, defaults to max of values)
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "radar-chart", params: {labels: ["Speed","Power","Range","Durability","Accuracy"], values: [8,6,9,4,7], max: 10, title: "Character Stats"}})`
