---
widget: vegalite-area
description: Area chart (Vega-Lite). Filled curves, optionally stacked by series.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array }
    x: { type: array }
    y: { type: array }
    series: { type: array }
    stack: { type: string, description: "'zero', 'normalize', 'center', null" }
    interpolate: { type: string }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Show magnitude over time, or part-to-whole breakdowns (`stack: 'normalize'` for 100%).
