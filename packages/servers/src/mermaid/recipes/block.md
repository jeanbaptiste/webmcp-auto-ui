---
widget: mermaid-block
description: Block diagram with columnar layout and connections between blocks.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid block diagram definition"
    columns:
      type: number
      description: "Number of columns in the layout"
    blocks:
      type: array
      items:
        type: object
        required: [id]
        properties:
          id:
            type: string
          label:
            type: string
          width:
            type: number
    links:
      type: array
      items:
        type: object
        required: [from, to]
        properties:
          from:
            type: string
          to:
            type: string
          label:
            type: string
---
Renders a block diagram. Provide either a raw `definition` or structured `blocks` and `links` with a column count.

## How
1. Call `mermaid_webmcp_widget_display({name: "block", params: {definition: "block-beta\n  columns 3\n  a[\"A\"] b[\"B\"] c[\"C\"]\n  a --> b"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-block", params: {definition: "block-beta\n  columns 3\n  ui[\"UI Layer\"]\n  api[\"API Layer\"]\n  db[(\"Database\")]\n  ui --> api\n  api --> db"}})
```
