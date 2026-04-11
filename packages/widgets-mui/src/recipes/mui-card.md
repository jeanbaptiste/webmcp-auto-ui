---
widget: mui-card
description: Material UI Card with optional image, subtitle, and action buttons
group: mui
schema:
  type: object
  required:
    - title
    - content
  properties:
    title:
      type: string
      description: Card title
    subtitle:
      type: string
      description: Optional subtitle below the title
    content:
      type: string
      description: Card body text
    image:
      type: string
      description: Optional image URL for the card media header
    actions:
      type: array
      description: Action buttons at the bottom of the card
      items:
        type: object
        required:
          - label
        properties:
          label:
            type: string
          variant:
            type: string
            description: "Button variant: text, outlined, or contained (default: text)"
---

## When to use
For presenting a single entity with a title, description, optional image, and optional actions. Good for product cards, profile summaries, article previews.

## How
1. Call `mui_webmcp_widget_display('mui-card', {title: "Project Alpha", content: "A cutting-edge initiative.", actions: [{label: "Details"}, {label: "Share", variant: "outlined"}]})`

## Common errors
- `title` and `content` are required
- `actions` is an array of objects with `label` (required) and optional `variant`
- `image` must be a valid URL
