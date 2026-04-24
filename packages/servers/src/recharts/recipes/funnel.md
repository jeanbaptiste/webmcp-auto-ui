---
widget: recharts-funnel
description: Funnel chart — stages from a wide top to a narrow bottom. Conversion pipelines.
group: recharts
schema:
  type: object
  required: [rows]
  properties:
    rows:
      type: array
      description: "[{name:'Visits', value:1000}, {name:'Signups', value:200}]"
    dataKey: { type: string, description: "default 'value'" }
    nameKey: { type: string, description: "default 'name'" }
---

## When to use
Ordered, monotonically decreasing stages (sales pipeline, onboarding drop-off).

## Example
```
recharts_webmcp_widget_display({name: "recharts-funnel", params: {
  rows: [
    {name:'Visits',value:5000},
    {name:'Signups',value:2500},
    {name:'Active',value:1200},
    {name:'Paid',value:300}
  ]
}})
```
