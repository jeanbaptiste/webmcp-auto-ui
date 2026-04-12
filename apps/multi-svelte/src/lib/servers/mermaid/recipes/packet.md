---
widget: mermaid-packet
description: Network packet diagram showing bit-level field layout.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid packet diagram definition"
    title:
      type: string
    rows:
      type: array
      description: "Each row contains fields with bit ranges"
      items:
        type: array
        items:
          type: object
          required: [start, end, label]
          properties:
            start:
              type: number
            end:
              type: number
            label:
              type: string
---
Renders a network packet diagram. Provide either a raw `definition` or structured `rows` with fields specifying bit ranges.
