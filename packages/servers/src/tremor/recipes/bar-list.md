---
widget: tremor-bar-list
description: Ranked list of items with inline value bars (Tremor).
group: tremor
schema:
  type: object
  required: [data]
  properties:
    title: { type: string }
    data: { type: array, description: "Array of { name, value, href? }" }
    color: { type: string }
    sortOrder: { type: string, description: "ascending | descending | none" }
---

## When to use
Top-N rankings with relative bars — traffic sources, top products, etc.

## Example
```
tremor_webmcp_widget_display({name: "tremor-bar-list", params: {
  title:'Top pages',
  data:[{name:'/home', value:456},{name:'/about', value:123}]
}})
```
