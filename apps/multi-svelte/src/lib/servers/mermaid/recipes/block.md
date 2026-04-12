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
