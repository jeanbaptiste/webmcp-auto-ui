---
widget: canvas2d-waterfall
description: Waterfall chart — cumulative additions and subtractions
group: canvas2d
schema:
  type: object
  required: [items]
  properties:
    title: { type: string }
    items:
      type: array
      items:
        type: object
        required: [label, value]
        properties:
          label: { type: string }
          value: { type: number, description: "Positive = addition, negative = subtraction" }
---

## When to use
Show how an initial value is affected by sequential positive/negative changes (P&L, budget breakdown).

## How
```
widget_display({name: "canvas2d-waterfall", params: {
  title: 'Q4 Profit breakdown',
  items: [
    { label: 'Revenue', value: 500 },
    { label: 'COGS', value: -200 },
    { label: 'OpEx', value: -150 },
    { label: 'Tax', value: -45 }
  ]
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-waterfall", params: {title: "Q4 Profit breakdown", items: [{label: "Revenue", value: 500}, {label: "COGS", value: -200}, {label: "OpEx", value: -150}, {label: "Tax", value: -45}]}})
```
