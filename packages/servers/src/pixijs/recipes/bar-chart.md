---
widget: pixijs-bar-chart
description: Animated bar chart with WebGL rendering — bars grow upward with spring animation
schema:
  type: object
  properties:
    labels:
      type: array
      items:
        type: string
      description: Category labels
    values:
      type: array
      items:
        type: number
      description: Bar values
    title:
      type: string
      description: Chart title
    colors:
      type: array
      items:
        type: string
      description: Bar colors (hex), cycled if fewer than values
  required:
    - values
---

## When to use

Use pixijs-bar-chart for animated bar comparisons with GPU acceleration. Ideal for:
- Category comparisons with visual pop
- Animated dashboards
- Presentations

## How
1. Call `pixijs_webmcp_widget_display({name: "bar-chart", params: {labels: ["A", "B", "C"], values: [40, 70, 30], title: "Sales"}})`

## Examples

```json
{
  "labels": ["A", "B", "C", "D"],
  "values": [40, 70, 30, 90],
  "title": "Sales by Region"
}
```
