---
widget: canvas2d-candlestick
description: Candlestick chart — OHLC financial data
group: canvas2d
schema:
  type: object
  required: [candles]
  properties:
    title: { type: string }
    candles:
      type: array
      items:
        type: object
        required: [open, high, low, close]
        properties:
          open: { type: number }
          high: { type: number }
          low: { type: number }
          close: { type: number }
          label: { type: string }
---

## When to use
Financial price data showing open/high/low/close per period.

## How
```
widget_display({name: "canvas2d-candlestick", params: {
  title: 'AAPL Daily',
  candles: [
    { open: 150, high: 155, low: 148, close: 153 },
    { open: 153, high: 158, low: 151, close: 149 },
    { open: 149, high: 152, low: 147, close: 151 }
  ]
}})
```

## Example
```
canvas2d_webmcp_widget_display({name: "canvas2d-candlestick", params: {title: "AAPL Daily", candles: [{open: 150, high: 155, low: 148, close: 153, label: "Mon"}, {open: 153, high: 158, low: 151, close: 149, label: "Tue"}, {open: 149, high: 152, low: 147, close: 151, label: "Wed"}]}})
```
