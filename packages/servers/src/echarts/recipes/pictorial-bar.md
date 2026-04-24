---
widget: echarts-pictorial-bar
description: Pictorial bar — bars drawn as repeated symbols (infographic style).
group: echarts
schema:
  type: object
  required: [categories, values]
  properties:
    title: { type: string }
    categories: { type: array }
    values: { type: array, description: Numeric values, one per category }
    symbol: { type: string, description: "ECharts symbol: 'circle', 'rect', 'triangle', 'diamond', 'pin', 'arrow', or 'path://...'" }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Infographic-style presentations where symbols carry meaning (people, buildings, currency).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-pictorial-bar", params: {
  categories: ["NY","LA","SF","CHI"],
  values: [12, 8, 15, 6], symbol: "circle",
  title: "Attendees per city"
}})
```
