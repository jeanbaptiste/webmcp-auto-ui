---
widget: nivo-funnel
description: Funnel chart — sequential stages with dropping values.
group: nivo
schema:
  type: object
  required: [data]
  properties:
    data: { type: array, description: "[{id, value, label?}, ...] ordered top→bottom" }
    direction: { type: string, description: "'vertical' (default) or 'horizontal'" }
---

## When to use
Visualize conversion rates across sequential funnel steps.

## Example
```
nivo_webmcp_widget_display({name: "nivo-funnel", params: { data: [{id:'visit', value:1000, label:'Visit'},{id:'signup', value:400, label:'Signup'},{id:'buy', value:80, label:'Buy'}] }})
```
