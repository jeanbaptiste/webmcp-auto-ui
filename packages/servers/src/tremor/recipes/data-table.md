---
widget: tremor-data-table
description: Simple data table (Tremor).
group: tremor
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: Array of row objects }
    columns: { type: array, description: Optional column keys; inferred from first row }
---

## When to use
Display structured tabular data — row-wise lists.

## Example
```
tremor_webmcp_widget_display({name: "tremor-data-table", params: {
  title:'Users', rows:[{name:'Ada', role:'eng'},{name:'Lin', role:'pm'}]
}})
```
