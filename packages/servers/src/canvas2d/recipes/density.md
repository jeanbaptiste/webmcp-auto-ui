---
widget: canvas2d-density
description: Kernel density estimation plot (Gaussian)
group: canvas2d
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, items: { type: number } }
    color: { type: string }
    bandwidth: { type: number, description: "KDE bandwidth (0 = auto Silverman)" }
---

## When to use
Smooth probability distribution from raw samples.

## How
```
widget_display({name: "canvas2d-density", params: {
  title: 'Response time distribution',
  values: [12,14,15,13,16,18,20,14,15,22,25,13,14]
}})
```
