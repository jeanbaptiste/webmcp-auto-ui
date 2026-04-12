---
widget: rough-candlestick
name: Candlestick Chart
description: Financial OHLC candlestick chart
data:
  candles:
    - { date: "Mon", open: 100, high: 115, low: 95, close: 110 }
    - { date: "Tue", open: 110, high: 120, low: 105, close: 108 }
    - { date: "Wed", open: 108, high: 125, low: 100, close: 122 }
    - { date: "Thu", open: 122, high: 130, low: 118, close: 119 }
    - { date: "Fri", open: 119, high: 128, low: 112, close: 126 }
  title: "Stock Price"
---

## Candlestick Chart

Financial chart showing open, high, low, close per period.

### Data format

- `candles` — array of `{date?, open, high, low, close}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "candlestick", params: {candles: [{date: "Mon", open: 100, high: 115, low: 95, close: 110}, {date: "Tue", open: 110, high: 120, low: 105, close: 108}], title: "Stock Price"}})`
