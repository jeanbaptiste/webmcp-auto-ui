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
