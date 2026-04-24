---
widget: echarts-pie
description: Pie / donut / rose chart — part-to-whole breakdown.
group: echarts
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, description: "[{ name, value }, ...]" }
    donut: { type: boolean, description: Render as donut (hollow center) }
    roseType: { type: string, description: "'radius' or 'area' for rose/Nightingale chart" }
---

## When to use
Show proportions of a whole. Prefer a bar chart when categories are numerous (> 6) — pies get unreadable.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-pie", params: {
  values: [
    { name: "Chrome", value: 63 },
    { name: "Safari", value: 19 },
    { name: "Firefox", value: 8 },
    { name: "Edge",    value: 6 },
    { name: "Other",   value: 4 }
  ],
  donut: true, title: "Browser share"
}})
```
