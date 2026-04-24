---
widget: tremor-metric
description: Large metric display with title/subtitle/description.
group: tremor
schema:
  type: object
  required: [value]
  properties:
    title: { type: string }
    subtitle: { type: string }
    value: { type: ["string","number"] }
    description: { type: string }
---

## When to use
Standalone big-number display without delta.

## Example
```
tremor_webmcp_widget_display({name: "tremor-metric", params: {
  title:'Revenue', value:'$71,465', description:'last 30 days'
}})
```
