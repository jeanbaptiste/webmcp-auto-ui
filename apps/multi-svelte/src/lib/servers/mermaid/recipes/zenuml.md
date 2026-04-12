---
widget: mermaid-zenuml
description: ZenUML sequence diagram with method call syntax.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid ZenUML definition"
    messages:
      type: array
      items:
        type: object
        required: [from, method]
        properties:
          from:
            type: string
          to:
            type: string
          method:
            type: string
          returnType:
            type: string
---
Renders a ZenUML diagram. Provide either a raw `definition` or structured `messages` with method calls.
