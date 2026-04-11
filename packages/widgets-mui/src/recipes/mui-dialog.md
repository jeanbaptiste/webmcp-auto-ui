---
widget: mui-dialog
description: Material UI modal dialog with title, content, and action buttons
group: mui
schema:
  type: object
  required:
    - title
    - content
  properties:
    title:
      type: string
      description: Dialog title
    content:
      type: string
      description: Dialog body text
    open:
      type: boolean
      description: "Whether dialog is initially open (default: true)"
    actions:
      type: array
      description: Action buttons in the dialog footer
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
For modal confirmations, alerts, or information dialogs that require user attention. The dialog opens on render and can be closed by clicking outside or pressing an action button.

## How
1. Call `mui_webmcp_widget_display('mui-dialog', {title: "Confirm Delete", content: "Are you sure you want to delete this item?", actions: [{label: "Cancel"}, {label: "Delete", variant: "contained"}]})`

## Common errors
- `title` and `content` are required
- `open` defaults to true — the dialog is visible on render
- Clicking any action button or the backdrop closes the dialog
