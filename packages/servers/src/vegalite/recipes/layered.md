---
widget: vegalite-layered
description: Multiple marks stacked on the same axes (e.g. line + point).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array }
    marks: { type: array, description: "List of mark types to overlay (default ['line','point'])" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Combine multiple visual encodings — line with markers, bar with rule, etc.
