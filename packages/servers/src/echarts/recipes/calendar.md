---
widget: echarts-calendar
description: Calendar heatmap — GitHub-style daily intensity grid for one year.
group: echarts
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, description: "[[\"YYYY-MM-DD\", value], ...]" }
    year: { type: string, description: Year to display (default = first date's year) }
    min: { type: number }
    max: { type: number }
---

## When to use
Daily activity or intensity over one year (commits, sales, exercise).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-calendar", params: {
  values: [["2024-01-02", 3], ["2024-01-03", 5], ["2024-02-10", 8], ["2024-06-21", 12]],
  year: "2024", title: "Commits"
}})
```
