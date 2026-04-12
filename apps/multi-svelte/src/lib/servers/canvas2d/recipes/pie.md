---
widget: canvas2d-pie
description: Pie chart — proportional sectors
group: canvas2d
schema:
  type: object
  required: [slices]
  properties:
    title: { type: string }
    slices:
      type: array
      items:
        type: object
        required: [label, value]
        properties:
          label: { type: string }
          value: { type: number }
---

## When to use
Show part-to-whole relationships (few categories, <8 ideal).

## How
```
widget_display('canvas2d-pie', {
  title: 'Market share',
  slices: [
    { label: 'Chrome', value: 65 },
    { label: 'Firefox', value: 15 },
    { label: 'Safari', value: 12 },
    { label: 'Other', value: 8 }
  ]
})
```
