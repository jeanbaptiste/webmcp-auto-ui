---
widget: vegalite-facet
description: Small multiples — replicate a chart across categories of a facet field.
group: vegalite
schema:
  type: object
  properties:
    title: { type: string }
    values: { type: array, description: "Rows [{x, y, <facetField>}]" }
    mark: { type: string, description: "line | bar | point | area ..." }
    facetField: { type: string, description: "Field used to split panels (default 'series')" }
    columns: { type: number, description: "Panels per row (default 3)" }
---

## When to use
Compare the same chart across subgroups side by side.
