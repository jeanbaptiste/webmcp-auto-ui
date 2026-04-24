---
widget: vega-spec
description: Render an arbitrary Vega (or Vega-Lite) JSON spec. Use when you need fine-grained control over a custom visualization that the pre-built Vega widgets don't cover.
group: vega
schema:
  type: object
  required: [spec]
  properties:
    spec: { type: object, description: Complete Vega or Vega-Lite JSON specification }
    mode: { type: string, description: "'vega' (default) or 'vega-lite'" }
---

## When to use
Full control. Compose signals, data transforms, scales, marks, interactions directly. Prefer the other vega-* widgets when a pre-built shape matches your data.

## Example
```
vega_webmcp_widget_display({ name: "vega-spec", params: { spec: { "$schema": "https://vega.github.io/schema/vega/v5.json", width: 400, height: 200, data: [{ name: "table", values: [{x:1,y:2},{x:2,y:4}] }], marks: [{ type: "symbol", from: {data: "table"}, encode: { enter: { x: {scale:"x", field:"x"}, y: {scale:"y", field:"y"} } } }] } } })
```
