---
widget: echarts-gauge
description: Dial gauge — single KPI value with min/max range and animated progress.
group: echarts
schema:
  type: object
  required: [value]
  properties:
    title: { type: string }
    value: { type: number }
    min: { type: number, description: Default 0 }
    max: { type: number, description: Default 100 }
    name: { type: string, description: Label shown under the value }
    unit: { type: string, description: Suffix for the displayed value (e.g. '%', 'MB') }
---

## When to use
Highlight a single KPI against a known range (utilization, health score, score /100).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-gauge", params: {
  value: 72, name: "CPU", unit: "%", title: "Server load"
}})
```
