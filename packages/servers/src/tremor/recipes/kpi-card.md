---
widget: tremor-kpi-card
description: KPI card — title + metric + delta badge (Tremor composite).
group: tremor
schema:
  type: object
  required: [title, metric]
  properties:
    title: { type: string }
    metric: { type: ["string","number"] }
    delta: { type: ["string","number"] }
    deltaType: { type: string, description: "increase | moderateIncrease | unchanged | moderateDecrease | decrease" }
    subtitle: { type: string }
---

## When to use
Dashboard headline numbers with trend indicator.

## Example
```
tremor_webmcp_widget_display({name: "tremor-kpi-card", params: {
  title:'Sales', metric:'$34,234', delta:'+12.5%', deltaType:'moderateIncrease'
}})
```
