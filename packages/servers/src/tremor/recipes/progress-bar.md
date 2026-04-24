---
widget: tremor-progress-bar
description: Horizontal progress bar with optional label and value.
group: tremor
schema:
  type: object
  required: [value]
  properties:
    value: { type: number, description: "0-100" }
    label: { type: string }
    color: { type: string }
    showValue: { type: boolean }
---

## When to use
Completion, utilization, loading progress.

## Example
```
tremor_webmcp_widget_display({name: "tremor-progress-bar", params: {
  value:72, label:'Quota used', color:'blue'
}})
```
