---
widget: perspective-candlestick
description: Candlestick chart (OHLC bars with body). Financial price action.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array, description: "Rows with open/high/low/close columns" }
    group_by: { type: array, description: Time / date column }
    split_by: { type: array }
    columns: { type: array, description: "[open, close, low, high]" }
    aggregates: { type: object }
---

## When to use
OHLC financial data. The `columns` order convention is `[open, close, low, high]`.

## Example
```
perspective_webmcp_widget_display({name: "perspective-candlestick", params: { rows: [...], group_by: ['date'], columns: ['open','close','low','high'] }})
```
