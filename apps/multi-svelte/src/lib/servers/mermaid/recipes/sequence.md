---
widget: mermaid-sequence
description: Sequence diagram showing interactions between participants over time.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid sequence diagram definition"
    participants:
      type: array
      items:
        type: string
      description: "Ordered list of participant names"
    messages:
      type: array
      items:
        type: object
        required: [from, to, text]
        properties:
          from:
            type: string
          to:
            type: string
          text:
            type: string
          type:
            type: string
            enum: [solid, dotted]
---
Renders a Mermaid sequence diagram. Provide either a raw `definition` string or structured `participants` and `messages`.
