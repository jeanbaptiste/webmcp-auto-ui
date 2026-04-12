---
widget: plotly-indicator
description: Gauge/number indicator — KPI display with optional delta and gauge.
group: plotly
schema:
  type: object
  required: [value]
  properties:
    title: { type: string, description: Indicator title }
    value: { type: number, description: Current value }
    mode: { type: string, description: "'gauge+number+delta' (default), 'number', 'gauge+number', 'delta'" }
    delta:
      type: object
      properties:
        reference: { type: number, description: Reference value for delta calculation }
    gauge:
      type: object
      description: Gauge configuration (axis range, bar color, etc.)
---

## When to use
Display a single KPI with optional gauge arc and delta from reference.

## Example
```
widget_display('plotly-indicator', { value: 72, title: 'Score', delta: { reference: 60 } })
```
