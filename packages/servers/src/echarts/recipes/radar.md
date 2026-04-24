---
widget: echarts-radar
description: Radar (spider) chart — compare entities across several quantitative dimensions.
group: echarts
schema:
  type: object
  required: [indicators, series]
  properties:
    title: { type: string }
    indicators: { type: array, description: "[{ name, max }, ...]  — axes and their max scale" }
    series: { type: array, description: "[{ name, value: [... same length as indicators ...] }, ...]" }
---

## When to use
Compare 2-5 entities across 4-8 dimensions (e.g. product scoring, RPG stats, multi-metric benchmarks).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-radar", params: {
  indicators: [
    { name: "Speed",  max: 100 },
    { name: "Range",  max: 100 },
    { name: "Comfort",max: 100 },
    { name: "Price",  max: 100 },
    { name: "Tech",   max: 100 }
  ],
  series: [
    { name: "Model A", value: [85, 70, 60, 55, 90] },
    { name: "Model B", value: [65, 90, 80, 70, 75] }
  ],
  title: "Model comparison"
}})
```
