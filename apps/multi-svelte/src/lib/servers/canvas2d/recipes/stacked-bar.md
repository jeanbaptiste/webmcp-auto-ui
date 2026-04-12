---
widget: canvas2d-stacked-bar
description: Stacked vertical bar chart with multiple series
group: canvas2d
schema:
  type: object
  required: [series]
  properties:
    title: { type: string }
    labels: { type: array, items: { type: string } }
    series:
      type: array
      items:
        type: object
        required: [name, values]
        properties:
          name: { type: string }
          values: { type: array, items: { type: number } }
---

## When to use
Compare composition across categories.

## How
```
widget_display({name: "canvas2d-stacked-bar", params: {
  title: 'Revenue by product',
  labels: ['Q1','Q2','Q3'],
  series: [
    { name: 'Product A', values: [30,40,50] },
    { name: 'Product B', values: [20,30,25] }
  ]
}})
```
