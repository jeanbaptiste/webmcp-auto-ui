---
widget: agcharts-linear-gauge
description: Linear gauge — single value on a horizontal/vertical scale.
group: agcharts
schema:
  type: object
  required: [value]
  properties:
    title: { type: string }
    value: { type: number }
    min: { type: number }
    max: { type: number }
    direction: { type: string, description: "'horizontal' (default) or 'vertical'" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-linear-gauge", params: { value: 65, min: 0, max: 100 }})
```
