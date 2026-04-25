---
widget: vegalite-violin
description: Violin plot — density estimate per category (emulated via density transform + area mark).
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y}] — x categorical, y numeric" }
    color: { type: string }
    xLabel: { type: string }
    yLabel: { type: string }
---

## When to use
Richer alternative to boxplot when distribution shape matters.

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-violin", params: { title: "Salary distribution by department", values: [{x:"Engineering",y:95},{x:"Engineering",y:110},{x:"Engineering",y:88},{x:"Engineering",y:120},{x:"Marketing",y:65},{x:"Marketing",y:72},{x:"Marketing",y:68},{x:"Marketing",y:80}], xLabel: "Department", yLabel: "Salary (k$)" }})
```
