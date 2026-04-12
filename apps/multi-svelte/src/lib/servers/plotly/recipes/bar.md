---
widget: plotly-bar
description: Bar chart (vertical or horizontal). Comparisons across categories.
group: plotly
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, description: Category labels (vertical) or values (horizontal) }
    y: { type: array, description: Values (vertical) or category labels (horizontal) }
    orientation: { type: string, description: "'v' (vertical, default) or 'h' (horizontal)" }
    color: { type: array, description: Bar colors }
    barmode: { type: string, description: "'group' (default), 'stack', 'relative', 'overlay'" }
    xLabel: { type: string, description: X-axis label }
    yLabel: { type: string, description: Y-axis label }
---

## When to use
Compare values across categories. Use orientation 'h' for long category names.

## Example
```
widget_display('plotly-bar', { x: ['A','B','C'], y: [10, 20, 15], title: 'Sales' })
```
