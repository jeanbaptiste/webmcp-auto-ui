---
widget: canvas2d-gauge
description: Semicircular gauge meter with needle
group: canvas2d
schema:
  type: object
  required: [value]
  properties:
    title: { type: string }
    value: { type: number }
    min: { type: number, default: 0 }
    max: { type: number, default: 100 }
    label: { type: string }
    zones:
      type: array
      items:
        type: object
        properties:
          from: { type: number }
          to: { type: number }
          color: { type: string }
---

## When to use
Display a single KPI against a scale (speed, health score, progress).

## How
```
widget_display({name: "canvas2d-gauge", params: {
  title: 'Server load',
  value: 72,
  min: 0, max: 100,
  label: 'CPU %'
}})
```
