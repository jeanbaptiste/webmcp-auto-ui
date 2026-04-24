---
widget: echarts-sankey
description: Sankey flow diagram — magnitude of transfers between categories.
group: echarts
schema:
  type: object
  required: [nodes, links]
  properties:
    title: { type: string }
    nodes: { type: array, description: "[{ name }, ...]" }
    links: { type: array, description: "[{ source, target, value }, ...] using node names" }
---

## When to use
Show flows (energy, user funnels, money, migration). Width of ribbon = magnitude.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-sankey", params: {
  nodes: [{name:"Visit"},{name:"Signup"},{name:"Purchase"},{name:"Churn"}],
  links: [
    { source:"Visit",  target:"Signup",   value: 60 },
    { source:"Visit",  target:"Churn",    value: 40 },
    { source:"Signup", target:"Purchase", value: 25 },
    { source:"Signup", target:"Churn",    value: 35 }
  ],
  title: "Funnel"
}})
```
