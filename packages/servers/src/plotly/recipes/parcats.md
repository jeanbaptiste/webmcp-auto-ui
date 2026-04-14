---
widget: plotly-parcats
description: Parallel categories — categorical dimension flow diagram.
group: plotly
schema:
  type: object
  required: [dimensions]
  properties:
    title: { type: string, description: Chart title }
    dimensions:
      type: array
      items:
        type: object
        properties:
          label: { type: string }
          values: { type: array, items: { type: string } }
      description: Categorical dimensions with label and values
    counts: { type: array, items: { type: number }, description: Count per combination }
    arrangement: { type: string, description: "'freeform' (default) or 'fixed' or 'perpendicular'" }
---

## When to use
Explore categorical data relationships (like a Sankey for categories).

## Example
```
plotly_webmcp_widget_display({name: "plotly-parcats", params: { dimensions: [{ label: 'Gender', values: ['M','F','M','F'] }, { label: 'Class', values: ['A','B','A','A'] }] }})
```
