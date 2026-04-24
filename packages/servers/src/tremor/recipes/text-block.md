---
widget: tremor-text-block
description: Typography block — Title + Subtitle + Text (Tremor).
group: tremor
schema:
  type: object
  properties:
    title: { type: string }
    subtitle: { type: string }
    body: { type: string }
---

## When to use
Section header or descriptive paragraph within a dashboard.

## Example
```
tremor_webmcp_widget_display({name: "tremor-text-block", params: {
  title:'Quarterly report', subtitle:'Q1 2026', body:'Overall positive growth ...'
}})
```
