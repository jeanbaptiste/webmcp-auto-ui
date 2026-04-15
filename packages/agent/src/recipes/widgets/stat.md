---
widget: stat
description: Key statistic (KPI, counter, total)
group: simple
schema:
  type: object
  required:
    - label
    - value
  properties:
    label:
      type: string
    value:
      type: string
    trend:
      type: string
    trendDir:
      type: string
      enum:
        - up
        - down
        - neutral
---

## When to use
Display a single key figure — KPI, counter, total, score. Ideal when the user asks "how many…" or requests a numerical summary.

## How to use
1. Fetch the data via the appropriate MCP tool (e.g. SQL query, API call)
2. Call `autoui_webmcp_widget_display('stat', { label: 'Active users', value: '1,247' })`
3. Optional: add `trend` (e.g. '+12%') and `trendDir` ('up'/'down'/'neutral') to show the trend

## Common mistakes
- Passing `value` as a number instead of a string — always convert to string
- Forgetting to format the number (thousand separators, units)
