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
