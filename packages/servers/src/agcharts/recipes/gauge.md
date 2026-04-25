---
widget: agcharts-gauge
description: Radial gauge — single value on a min/max scale.
group: agcharts
schema:
  type: object
  required: [value]
  properties:
    title: { type: string }
    value: { type: number }
    min: { type: number, description: "Default 0" }
    max: { type: number, description: "Default 100" }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-gauge", params: { value: 72, min: 0, max: 100, title: 'Score' }})
```
