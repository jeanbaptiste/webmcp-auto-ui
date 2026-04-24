---
widget: vegalite-violin
description: Violin plot — density estimate per category (emulated via density transform + area mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}] — x categorical, y numeric" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Richer alternative to boxplot when distribution shape matters.
