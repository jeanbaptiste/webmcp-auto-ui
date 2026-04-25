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

## Example
```
vegalite_webmcp_widget_display({name: "vegalite-facet", params: { title: "Sales by region", values: [{x:"Jan",y:30,series:"North"},{x:"Feb",y:45,series:"North"},{x:"Jan",y:20,series:"South"},{x:"Feb",y:35,series:"South"},{x:"Jan",y:50,series:"West"},{x:"Feb",y:60,series:"West"}], mark: "bar", facetField: "series", columns: 3 }})
```
