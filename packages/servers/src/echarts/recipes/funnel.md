---
widget: echarts-funnel
description: Funnel chart — sequential stage drop-off (conversion, sales pipeline).
group: echarts
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, description: "[{ name, value }, ...] in funnel order" }
    sort: { type: string, description: "'descending' (default), 'ascending', 'none'" }
---

## When to use
Conversion funnels, pipeline stages. Prefer Sankey when flows split/rejoin.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-funnel", params: {
  values: [
    { name: "Visit",    value: 100 },
    { name: "Signup",   value: 60 },
    { name: "Activate", value: 35 },
    { name: "Pay",      value: 12 }
  ],
  title: "Acquisition funnel"
}})
```
