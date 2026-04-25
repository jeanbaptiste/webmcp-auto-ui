---
widget: agcharts-candlestick
description: Candlestick chart — OHLC with bullish/bearish body fill.
group: agcharts
schema:
  type: object
  properties:
    title: { type: string }
    data: { type: array, description: "[{date, open, high, low, close}]" }
    xKey: { type: string }
    openKey: { type: string }
    highKey: { type: string }
    lowKey: { type: string }
    closeKey: { type: string }
---

## Example
```
agcharts_webmcp_widget_display({name: "agcharts-candlestick", params: { data:[{date:'2024-01-01',open:100,high:110,low:95,close:105}] }})
```
