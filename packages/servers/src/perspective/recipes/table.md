---
widget: perspective-table
description: Interactive datagrid (sortable, filterable). Best for raw tabular exploration.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string, description: Optional title }
    rows: { type: array, description: "Array of row objects: [{col1: v, col2: v, ...}, ...]" }
    columns: { type: array, description: Subset of columns to display }
    sort: { type: array, description: "Sort directives: [['col','asc'|'desc']]" }
    filter: { type: array, description: "Filter directives: [['col','==',value]]" }
---

## When to use
Inspect a dataset row-by-row with sort + filter. Foundation widget — use it before pivoting.

## Example
```
perspective_webmcp_widget_display({name: "perspective-table", params: { rows: [{name:'A', value:10}, {name:'B', value:20}] }})
```
