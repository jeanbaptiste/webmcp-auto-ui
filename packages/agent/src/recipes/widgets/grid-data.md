---
widget: grid-data
description: Data grid with cell highlighting
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
          width:
            type: string
    rows:
      type: array
      items:
        type: array
    highlights:
      type: array
      items:
        type: object
        required:
          - row
          - col
        properties:
          row:
            type: number
          col:
            type: number
          color:
            type: string
---

## When to use
Display data in a grid with the ability to highlight specific cells — dashboards, comparison matrices, tabular heatmaps. Prefer `data-table` for a classic sortable table.

## How to use
1. Fetch data via MCP
2. Structure into rows (arrays) with optional columns
3. Add `highlights` to draw attention to specific cells
4. Call `autoui_webmcp_widget_display('grid-data', { title: 'Risk Matrix', columns: [{ key: 'zone', label: 'Zone' }, { key: 'score', label: 'Score' }], rows: [['North', 85], ['South', 42]], highlights: [{ row: 0, col: 1, color: '#f44336' }] })`

## Common mistakes
- The `row` and `col` indexes in `highlights` are 0-based
- `rows` is an array of arrays (not objects), unlike `data-table`
