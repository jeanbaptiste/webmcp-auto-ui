---
widget: plotly-treemap
description: Treemap — hierarchical data as nested rectangles.
group: plotly
schema:
  type: object
  required: [labels, parents]
  properties:
    title: { type: string, description: Chart title }
    ids: { type: array, items: { type: string }, description: Unique node IDs }
    labels: { type: array, items: { type: string }, description: Display labels }
    parents: { type: array, items: { type: string }, description: "Parent ID per node ('' for root)" }
    values: { type: array, items: { type: number }, description: Values per node }
    branchvalues: { type: string, description: "'total' (default) or 'remainder'" }
    tiling: { type: object, description: "Tiling options (packing, pad, etc.)" }
---

## When to use
Show hierarchical part-of-whole relationships (disk usage, budgets, org).

## Example
```
plotly_webmcp_widget_display({name: "plotly-treemap", params: { labels: ['Root','A','B','A1','A2'], parents: ['','Root','Root','A','A'], values: [0,10,5,6,4] }})
```
