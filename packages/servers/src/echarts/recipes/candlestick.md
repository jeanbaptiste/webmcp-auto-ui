---
widget: echarts-candlestick
description: Candlestick (OHLC) chart for financial time series. Includes zoom slider.
group: echarts
schema:
  type: object
  required: [dates, ohlc]
  properties:
    title: { type: string }
    dates: { type: array, description: "Date strings, one per candle" }
    ohlc: { type: array, description: "[[open, close, low, high], ...]  — one quadruple per date" }
    name: { type: string, description: Series name (default 'OHLC') }
---

## When to use
Financial price history. Up candles (close > open) are rendered red, down candles green.

## Example
```
echarts_webmcp_widget_display({ name: "echarts-candlestick", params: {
  dates: ["2024-01","2024-02","2024-03","2024-04"],
  ohlc: [[20,34,10,38],[40,35,30,50],[31,38,33,44],[38,15,5,42]],
  title: "Q1 price action"
}})
```
