---
widget: rough-candlestick
description: Financial OHLC candlestick chart
schema:
  type: object
  required:
    - candles
  properties:
    candles:
      type: array
      items:
        type: object
        required:
          - open
          - high
          - low
          - close
        properties:
          date:
            type: string
            description: Period label (e.g. day name or date)
          open:
            type: number
            description: Opening price
          high:
            type: number
            description: Highest price
          low:
            type: number
            description: Lowest price
          close:
            type: number
            description: Closing price
      description: OHLC candle data per period
    title:
      type: string
      description: Chart title
---

## Candlestick Chart

Financial chart showing open, high, low, close per period.

### Data format

- `candles` — array of `{date?, open, high, low, close}` objects
- `title` — optional chart title

## How
1. Call `rough_webmcp_widget_display({name: "candlestick", params: {candles: [{date: "Mon", open: 100, high: 115, low: 95, close: 110}, {date: "Tue", open: 110, high: 120, low: 105, close: 108}], title: "Stock Price"}})`
