---
widget: plotly-funnel
description: Funnel chart — progressive reduction through stages.
group: plotly
schema:
  type: object
  required: [x, y]
  properties:
    title: { type: string, description: Chart title }
    x: { type: array, items: { type: number }, description: Values per stage }
    y: { type: array, items: { type: string }, description: Stage labels }
    textinfo: { type: string, description: "Text info (default 'value+percent initial')" }
---

## When to use
Show conversion funnel (marketing, sales pipeline).

## Example
```
plotly_webmcp_widget_display({name: "plotly-funnel", params: { x: [1000, 600, 400, 200, 50], y: ['Visits','Signups','Trials','Paid','Enterprise'] }})
```
