---
widget: plotly-scatterternary
description: Ternary scatter plot — three-component composition data.
group: plotly
schema:
  type: object
  required: [a, b, c]
  properties:
    title: { type: string, description: Chart title }
    a: { type: array, items: { type: number }, description: Component A values }
    b: { type: array, items: { type: number }, description: Component B values }
    c: { type: array, items: { type: number }, description: Component C values }
    mode: { type: string, description: "'markers' (default)" }
    text: { type: array, items: { type: string }, description: Hover text }
    markerSize: { type: number, description: Marker size (default 8) }
---

## When to use
Composition data where a+b+c = constant (chemistry, geology, material science).

## Example
```
plotly_webmcp_widget_display({name: "plotly-scatterternary", params: { a: [0.5, 0.3, 0.2], b: [0.3, 0.4, 0.5], c: [0.2, 0.3, 0.3], text: ['Mix1','Mix2','Mix3'] }})
```
