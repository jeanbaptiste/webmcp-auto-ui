---
widget: vega-boxplot
description: Box-and-whisker plot per group (1.5 IQR whiskers).
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
vega_webmcp_widget_display({ name: "vega-boxplot", params: { groups: { A:[1,2,3,4,5], B:[2,3,4,5,6,7] } } })
```
