---
widget: sequence
description: Sequence diagram showing message exchanges between participants (Mermaid.js)
group: mermaid
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid sequenceDiagram syntax"
    participants:
      type: array
      description: "Structured participants [{name, alias?}] — alternative to definition"
      items:
        type: object
        properties:
          name:
            type: string
          alias:
            type: string
    messages:
      type: array
      description: "Structured messages [{from, to, text, type?}] — used with participants"
      items:
        type: object
        properties:
          from:
            type: string
          to:
            type: string
          text:
            type: string
          type:
            type: string
            description: "sync (default), async, reply, note"
---

## When to use
For showing message exchanges over time between actors, services, or components. Ideal for API call flows, protocol handshakes, user interaction sequences.

## How
Provide either raw Mermaid syntax via `definition`, or structured data via `participants` + `messages`:

**Raw syntax:**
```
widget_display('sequence', { definition: "sequenceDiagram\n  participant A as Browser\n  participant B as Server\n  participant C as DB\n  A->>B: HTTP GET /users\n  B->>C: SELECT * FROM users\n  C-->>B: rows\n  B-->>A: JSON response" })
```

**Structured data:**
```
widget_display('sequence', {
  participants: [
    { name: "Browser", alias: "A" },
    { name: "Server", alias: "B" },
    { name: "DB", alias: "C" }
  ],
  messages: [
    { from: "Browser", to: "Server", text: "HTTP GET /users" },
    { from: "Server", to: "DB", text: "SELECT * FROM users" },
    { from: "DB", to: "Server", text: "rows", type: "reply" },
    { from: "Server", to: "Browser", text: "JSON response", type: "reply" }
  ]
})
```

## Common errors
- Participant names with spaces need quoting or aliases
- Use `->>` for synchronous, `-->>` for reply/dashed arrows
- `activate`/`deactivate` blocks must be balanced
