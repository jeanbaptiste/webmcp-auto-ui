---
widget: mermaid-requirement
description: Requirement diagram showing requirements, design elements, and their relationships.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid requirement diagram definition"
    requirements:
      type: array
      items:
        type: object
        required: [id, name]
        properties:
          id:
            type: string
          name:
            type: string
          text:
            type: string
          risk:
            type: string
            enum: [low, medium, high]
          verifyMethod:
            type: string
            enum: [analysis, inspection, test, demonstration]
    elements:
      type: array
      items:
        type: object
        required: [name]
        properties:
          name:
            type: string
          type:
            type: string
          docRef:
            type: string
    relations:
      type: array
      items:
        type: object
        required: [from, to, type]
        properties:
          from:
            type: string
          to:
            type: string
          type:
            type: string
            enum: [satisfies, traces, contains, refines, copies, derives, verifies]
---
Renders a requirement diagram. Provide either a raw `definition` or structured `requirements`, `elements`, and `relations`.

## How
1. Call `mermaid_webmcp_widget_display({name: "requirement", params: {definition: "requirementDiagram\n  requirement req1 {\n    id: 1\n    text: Must be fast\n    risk: high\n  }\n  element app {\n    type: application\n  }\n  app - satisfies -> req1"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-requirement", params: {definition: "requirementDiagram\n  requirement auth {\n    id: REQ-01\n    text: Users must authenticate before accessing data\n    risk: high\n    verifymethod: test\n  }\n  requirement perf {\n    id: REQ-02\n    text: Response time under 200ms at p99\n    risk: medium\n    verifymethod: analysis\n  }\n  element authService {\n    type: service\n    docRef: docs/auth.md\n  }\n  authService - satisfies -> auth\n  authService - traces -> perf"}})
```
