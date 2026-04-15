---
widget: stat-card
description: Enhanced stat card with trend and variant
group: rich
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
    unit:
      type: string
    delta:
      type: string
    trend:
      type: string
      enum:
        - up
        - down
        - flat
    previousValue:
      type: string
    variant:
      type: string
      enum:
        - default
        - success
        - warning
        - error
        - info
---

## When to use
For an enriched KPI with context — delta, previous value, unit, colored variant. Prefer `stat` for a simple number with no additional context.

## How to use
1. Fetch the metric and its comparison value via MCP
2. Calculate the delta if needed
3. Call `autoui_webmcp_widget_display('stat-card', { label: 'Revenue', value: '142k', unit: '€', delta: '+12%', trend: 'up', previousValue: '127k', variant: 'success' })`
