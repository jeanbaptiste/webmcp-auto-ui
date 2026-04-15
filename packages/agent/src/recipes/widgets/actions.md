---
widget: actions
description: Row of action buttons
group: simple
schema:
  type: object
  required:
    - buttons
  properties:
    buttons:
      type: array
      items:
        type: object
        required:
          - label
        properties:
          label:
            type: string
          primary:
            type: boolean
---

## When to use
Offer action choices to the user — confirmation, navigation, or selection among multiple options.

## How to use
1. Identify the relevant actions based on context
2. Call `autoui_webmcp_widget_display('actions', { buttons: [{ label: 'Confirm', primary: true }, { label: 'Cancel' }] })`
