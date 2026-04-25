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

## How
1. Call `mermaid_webmcp_widget_display({name: "sequence", params: {definition: "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob-->>Alice: Hi"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-sequence", params: {definition: "sequenceDiagram\n  participant Client\n  participant API\n  participant Auth\n  participant DB\n  Client->>API: POST /login {email, password}\n  API->>Auth: validate(email, password)\n  Auth->>DB: SELECT user WHERE email=?\n  DB-->>Auth: user record\n  Auth-->>API: JWT token\n  API-->>Client: 200 {token}"}})
```
