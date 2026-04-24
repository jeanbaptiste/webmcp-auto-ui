---
widget: tremor-progress-circle
description: Circular progress indicator.
group: tremor
schema:
  type: object
  required: [value]
  properties:
    value: { type: number, description: "0-100" }
    label: { type: string }
    size: { type: string, description: "xs | sm | md | lg | xl" }
    color: { type: string }
    radius: { type: number }
    strokeWidth: { type: number }
---

## When to use
Compact completion gauge — dashboards, cards.

## Example
```
tremor_webmcp_widget_display({name: "tremor-progress-circle", params: {
  value:65, label:'CPU', size:'lg', color:'emerald'
}})
```
