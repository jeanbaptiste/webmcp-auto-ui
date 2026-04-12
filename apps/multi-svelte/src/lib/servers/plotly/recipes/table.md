---
widget: plotly-table
description: Interactive data table with styled headers and cells.
group: plotly
schema:
  type: object
  required: [header, cells]
  properties:
    title: { type: string, description: Chart title }
    header:
      type: object
      required: [values]
      properties:
        values: { type: array, items: { type: string }, description: Column header names }
        fillColor: { type: string, description: Header background color }
    cells:
      type: object
      required: [values]
      properties:
        values: { type: array, description: "Array of columns, each column is an array of values" }
        fillColor: { type: string, description: Cell background color }
---

## When to use
Display tabular data with formatting. Each column in cells.values is an array.

## Example
```
widget_display('plotly-table', { header: { values: ['Name','Age'] }, cells: { values: [['Alice','Bob'],[30,25]] } })
```
