---
widget: agcharts-sunburst
description: Sunburst — hierarchical proportions as concentric rings.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array }
    labelKey: { type: string }
    sizeKey: { type: string }
    colorKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-sunburst", params: { data:[{label:'A',size:30,children:[{label:'A1',size:10}]}] }})
```
