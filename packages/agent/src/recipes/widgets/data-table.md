---
widget: data-table
description: Sortable data table with configurable columns
group: rich
schema:
  type: object
  required:
    - rows
  properties:
    title:
      type: string
    columns:
      type: array
      items:
        type: object
        required:
          - key
          - label
        properties:
          key:
            type: string
          label:
            type: string
          align:
            type: string
            enum:
              - left
              - center
              - right
    rows:
      type: array
      items:
        type: object
---

## When to use
Display tabular data with multiple columns — query results, record lists, inventories. Prefer `kv` for a single entity, `list` for a single column.

## How to use
1. Fetch data via MCP (e.g. SQL result, list of objects)
2. Optional: define `columns` to control column order and labels
3. Call `autoui_webmcp_widget_display('data-table', { title: 'Users', columns: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }], rows: [{ name: 'Alice', email: 'alice@ex.com' }] })`

## Common mistakes
- Forgetting that `rows` is an array of objects (not an array of arrays)
- Defining `columns.key` values that do not match the keys in the `rows` objects
