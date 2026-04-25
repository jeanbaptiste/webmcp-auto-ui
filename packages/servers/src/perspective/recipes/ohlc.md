---
widget: perspective-ohlc
description: OHLC chart (open/high/low/close ticks, no body). Financial price ticks.
group: perspective
schema:
  type: object
  required: [rows]
  properties:
    title: { type: string }
    rows: { type: array }
    group_by: { type: array, description: Time / date column }
    split_by: { type: array }
    columns: { type: array, description: "[open, close, low, high]" }
    aggregates: { type: object }
---

## When to use
Same as candlestick but with thinner ticks. Better for dense series.

## Example
```
perspective_webmcp_widget_display({name: "perspective-ohlc", params: { rows: [...], group_by: ['date'], columns: ['open','close','low','high'] }})
```
