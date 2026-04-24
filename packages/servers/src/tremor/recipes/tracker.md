---
widget: tremor-tracker
description: Uptime / status tracker bar (Tremor).
group: tremor
schema:
  type: object
  required: [data]
  properties:
    title: { type: string }
    subtitle: { type: string }
    data: { type: array, description: "Array of { color, tooltip }" }
---

## When to use
Per-period uptime indicators — each item is a colored segment with tooltip.

## Example
```
tremor_webmcp_widget_display({name: "tremor-tracker", params: {
  title:'Uptime', data:[{color:'emerald', tooltip:'OK'},{color:'rose', tooltip:'Down'}]
}})
```
