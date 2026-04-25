---
widget: vegalite-concat
description: Compose multiple Vega-Lite specs side by side or stacked.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    direction: { type: string, description: "'horizontal' | 'vertical' | 'wrap' (default)" }
    specs: { type: array, description: "Array of complete Vega-Lite child specs" }
---

## When to use
Dashboards: bar + line + summary side by side.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-concat", params: { title: "Sales dashboard", direction: "horizontal", specs: [ {data:{values:[{x:"Q1",y:30},{x:"Q2",y:55},{x:"Q3",y:40},{x:"Q4",y:70}]},mark:"bar",encoding:{x:{field:"x",type:"nominal"},y:{field:"y",type:"quantitative"}}}, {data:{values:[{x:"Q1",y:30},{x:"Q2",y:55},{x:"Q3",y:40},{x:"Q4",y:70}]},mark:"line",encoding:{x:{field:"x",type:"nominal"},y:{field:"y",type:"quantitative"}}} ] }})
```
