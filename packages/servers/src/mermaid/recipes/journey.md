---
widget: mermaid-journey
description: User journey map showing tasks grouped by sections with satisfaction scores.
schema:
  type: object
  properties:
    definition:
      type: string
      description: "Raw Mermaid journey definition"
    title:
      type: string
    sections:
      type: array
      items:
        type: object
        required: [name, tasks]
        properties:
          name:
            type: string
          tasks:
            type: array
            items:
              type: object
              required: [name, score]
              properties:
                name:
                  type: string
                score:
                  type: number
                  description: "Satisfaction score 1-5"
                actors:
                  type: array
                  items:
                    type: string
---
Renders a user journey map. Provide either a raw `definition` or structured `sections` with tasks and satisfaction scores (1-5).

## How
1. Call `mermaid_webmcp_widget_display({name: "journey", params: {definition: "journey\n  title User Flow\n  section Onboarding\n    Sign up: 5: User\n    Tutorial: 3: User"}})`

## Example
```
mermaid_webmcp_widget_display({name: "mermaid-journey", params: {definition: "journey\n  title Customer Purchase Journey\n  section Discovery\n    Find product: 4: Customer\n    Read reviews: 3: Customer\n  section Purchase\n    Add to cart: 5: Customer\n    Checkout: 2: Customer, Support\n    Payment: 3: Customer\n  section Post-purchase\n    Delivery tracking: 4: Customer\n    Leave review: 2: Customer"}})
```
