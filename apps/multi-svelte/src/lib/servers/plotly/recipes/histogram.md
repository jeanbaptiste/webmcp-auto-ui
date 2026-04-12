---
widget: plotly-histogram
description: Histogram — frequency distribution of values.
group: plotly
schema:
  type: object
  required: [x]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: Data values to bin }
    nbinsx: { type: number, description: Number of bins }
    histnorm: { type: string, description: "'', 'percent', 'probability', 'density', 'probability density'" }
    cumulative: { type: boolean, description: Cumulative histogram (default false) }
    xLabel: { type: string, description: X-axis label }
    yLabel: { type: string, description: Y-axis label }
---

## When to use
Show frequency distribution of a continuous variable.

## Example
```
widget_display('plotly-histogram', { x: [1,1,2,2,2,3,3,4,5,5,5,5], nbinsx: 5, title: 'Distribution' })
```
