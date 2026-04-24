---
widget: vegalite-spec
description: Render a full, hand-written Vega-Lite spec — escape hatch for anything the grammar supports.
group: vegalite
schema:
  type: object
  required: [spec]
  properties:
    spec: { type: object, description: "A complete Vega-Lite v5 specification object" }
---

## When to use
When a named widget does not cover your case. The spec is passed to `vega-embed` as-is; only the theme config is merged on top.

## Example
```
vegalite_webmcp_widget_display({
  name: "vegalite-spec",
  params: { spec: {
    data: { values: [{a:'A',b:28},{a:'B',b:55}] },
    mark: "bar",
    encoding: { x: {field:'a',type:'nominal'}, y: {field:'b',type:'quantitative'} }
  } }
})
```
