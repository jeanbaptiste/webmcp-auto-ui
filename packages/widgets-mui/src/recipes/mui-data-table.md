---
widget: mui-data-table
description: Material UI data table with sortable columns and built-in pagination
group: mui
schema:
  type: object
  required:
    - columns
    - rows
  properties:
    title:
      type: string
      description: Optional table title
    columns:
      type: array
      description: Column definitions
      items:
        type: object
        required:
          - field
          - header
        properties:
          field:
            type: string
            description: Key in each row object
          header:
            type: string
            description: Display header text
          width:
            type: number
            description: Optional column width in pixels
    rows:
      type: array
      description: Array of row objects
      items:
        type: object
---

## When to use
For tabular data with many rows. Provides built-in pagination (5/10/25/50 rows per page) and sticky headers for scrolling.

## How
1. Get data from MCP (list of records)
2. Call `mui_webmcp_widget_display('mui-data-table', {columns: [{field: "name", header: "Name"}, {field: "age", header: "Age", width: 80}], rows: [{name: "Alice", age: 30}, {name: "Bob", age: 25}]})`

## Common errors
- `columns` and `rows` are both required
- Each column must have `field` (matching a key in row objects) and `header`
- Row values are converted to strings for display
