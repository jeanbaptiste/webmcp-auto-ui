---
widget: canvas2d-bar-chart
description: Vertical bar chart with labels
group: canvas2d
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, items: { type: number } }
    labels: { type: array, items: { type: string } }
    color: { type: string }
    colors: { type: array, items: { type: string } }
---

## When to use
Compare discrete categories by magnitude.

## How
```
widget_display({name: "canvas2d-bar-chart", params: {
  title: 'Sales by quarter',
  values: [120, 200, 150, 280],
  labels: ['Q1', 'Q2', 'Q3', 'Q4']
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-bar-chart", params: {title: "Sales by quarter", values: [120, 200, 150, 280], labels: ["Q1", "Q2", "Q3", "Q4"]}})
```
