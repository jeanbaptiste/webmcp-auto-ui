---
widget: agcharts-treemap
description: Treemap — hierarchical proportions as nested rectangles.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "Rows like {label, size, color?}" }
    labelKey: { type: string }
    sizeKey: { type: string }
    colorKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-treemap", params: { data:[{label:'A',size:30},{label:'B',size:70}] }})
```
