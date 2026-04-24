---
widget: tremor-callout
description: Highlighted info/warning/error callout (Tremor).
group: tremor
schema:
  type: object
  required: [title]
  properties:
    title: { type: string }
    body: { type: string }
    color: { type: string, description: "blue | emerald | amber | rose | ..." }
---

## When to use
Draw attention to an alert, tip, or status message.

## Example
```
tremor_webmcp_widget_display({name: "tremor-callout", params: {
  title:'Heads up', body:'Build exceeded quota', color:'amber'
}})
```
