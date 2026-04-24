---
widget: echarts-theme-river
description: ThemeRiver (streamgraph) — evolution of several categories over time.
group: echarts
schema:
  type: object
  required: [values]
  properties:
    title: { type: string }
    values: { type: array, description: "[[date, value, category], ...] — one row per (date, category)" }
---

## When to use
Show how several categories ebb and flow over time (music genres, topic trends, release mix).

## Example
```
echarts_webmcp_widget_display({ name: "echarts-theme-river", params: {
  values: [
    ["2024-01-01", 10, "A"], ["2024-02-01", 15, "A"], ["2024-03-01", 12, "A"],
    ["2024-01-01",  8, "B"], ["2024-02-01", 10, "B"], ["2024-03-01", 14, "B"]
  ],
  title: "Category mix"
}})
```
