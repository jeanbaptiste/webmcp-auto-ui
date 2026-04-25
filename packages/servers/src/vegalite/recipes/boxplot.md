---
widget: vegalite-boxplot
description: Box-and-whisker plot per category (Vega-Lite boxplot mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, series?}] — x categorical, y numeric" }
    extent: { type: number, description: "IQR multiplier for whiskers (default 1.5)" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Summarise distribution (median, quartiles, outliers) across categories.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-boxplot", params: { title: "Score by group", values: [{x:"A",y:42},{x:"A",y:55},{x:"A",y:61},{x:"A",y:37},{x:"A",y:70},{x:"B",y:80},{x:"B",y:65},{x:"B",y:90},{x:"B",y:75},{x:"B",y:58}], xLabel: "Group", yLabel: "Score" }})
```
