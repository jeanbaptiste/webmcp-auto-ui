---
widget: tremor-legend
description: Standalone legend (Tremor).
group: tremor
schema:
  type: object
  required: [categories]
  properties:
    categories: { type: array }
    colors: { type: array }
---

## When to use
Display a shared legend for an external composition.

## Example
```
tremor_webmcp_widget_display({name: "tremor-legend", params: {
  categories:['Sales','Profit'], colors:['blue','emerald']
}})
```
