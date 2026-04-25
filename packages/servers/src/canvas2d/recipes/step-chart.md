---
widget: canvas2d-step-chart
description: Step chart — piecewise constant line (no interpolation)
group: canvas2d
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, items: { type: number } }
    labels: { type: array, items: { type: string } }
    color: { type: string }
---

## When to use
Data that changes in discrete steps (pricing tiers, inventory levels, state transitions).

## How
```
widget_display({name: "canvas2d-step-chart", params: {
  title: 'Pricing tiers',
  values: [10, 10, 15, 15, 20, 25, 25],
  labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul']
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-step-chart", params: {title: "Pricing tiers", values: [10, 10, 15, 15, 20, 25, 25], labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul"]}})
```
