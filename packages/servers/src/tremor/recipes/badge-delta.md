---
widget: tremor-badge-delta
description: Single delta badge — up/down trend pill (Tremor).
group: tremor
schema:
  type: object
  required: [text]
  properties:
    text: { type: string, description: Label inside the badge }
    deltaType: { type: string, description: "increase | moderateIncrease | unchanged | moderateDecrease | decrease" }
    size: { type: string, description: "xs | sm | md | lg | xl" }
---

## When to use
Standalone trend indicator.

## Example
```
tremor_webmcp_widget_display({name: "tremor-badge-delta", params: {
  text:'+9.3%', deltaType:'increase'
}})
```
