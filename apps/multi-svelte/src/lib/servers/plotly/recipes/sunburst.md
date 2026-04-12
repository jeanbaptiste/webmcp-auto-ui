---
widget: plotly-sunburst
description: Sunburst chart — hierarchical data as concentric rings.
group: plotly
schema:
  type: object
  required: [labels, parents]
  properties:
    title: { type: string, description: Chart title }
    ids: { type: array, items: { type: string }, description: Unique node IDs }
    labels: { type: array, items: { type: string }, description: Display labels }
    parents: { type: array, items: { type: string }, description: "Parent ID for each node ('' for root)" }
    values: { type: array, items: { type: number }, description: Values per node }
    branchvalues: { type: string, description: "'total' (default) or 'remainder'" }
---

## When to use
Explore hierarchical data with drill-down (org charts, file sizes, budgets).

## Example
```
plotly_webmcp_widget_display({name: "plotly-sunburst", params: { labels: ['Root','A','B','A1','A2'], parents: ['','Root','Root','A','A'], values: [0,10,5,6,4] }})
```
