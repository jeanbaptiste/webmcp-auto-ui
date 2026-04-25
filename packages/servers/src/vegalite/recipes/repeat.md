---
widget: vegalite-repeat
description: Scatter matrix (SPLOM) — every pair of fields plotted against each other.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows with multiple numeric fields" }
    fields: { type: array, description: "Field names to pair (e.g. ['sepalLength','sepalWidth',...])" }
    colorField: { type: string, description: "Optional categorical field for color" }
    columns: { type: number }
    mark: { type: object, description: "Override mark definition" }
---

## When to use
Explore relationships across many numeric dimensions simultaneously.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-repeat", params: { title: "Iris SPLOM", values: [{sepalLength:5.1,sepalWidth:3.5,petalLength:1.4,species:"setosa"},{sepalLength:6.3,sepalWidth:3.3,petalLength:4.7,species:"versicolor"},{sepalLength:7.1,sepalWidth:3.0,petalLength:5.9,species:"virginica"},{sepalLength:4.9,sepalWidth:3.0,petalLength:1.4,species:"setosa"},{sepalLength:5.8,sepalWidth:2.7,petalLength:4.1,species:"versicolor"}], fields: ["sepalLength","sepalWidth","petalLength"], colorField: "species" }})
```
