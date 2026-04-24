---
widget: vega-violin
description: Violin plots — KDE density side-by-side per group.
group: vega
schema:
  type: object
  required: [groups]
  properties:
    title: { type: string }
    groups: { type: object, description: "Map { groupName: [numericValues...] }" }
    xLabel: { type: string }
    yLabel: { type: string }
---

## Example
```
vega_webmcp_widget_display({ name: "vega-violin", params: { groups: { A:[1,2,2,3,3,4,5], B:[2,3,3,4,5,5,6] } } })
```
