---
widget: mui-form
description: Material UI form with text, number, select, and checkbox fields
group: mui
schema:
  type: object
  required:
    - fields
  properties:
    title:
      type: string
      description: Optional form title
    fields:
      type: array
      description: Form field definitions
      items:
        type: object
        required:
          - name
          - type
          - label
        properties:
          name:
            type: string
            description: Field name (used as key in form state)
          type:
            type: string
            description: "Field type: text, number, select, or checkbox"
          label:
            type: string
            description: Display label
          options:
            type: array
            description: Options for select fields
            items:
              type: string
          value:
            description: Optional default value
---

## When to use
For collecting user input with standard form controls. Supports text inputs, number inputs, dropdown selects, and checkboxes.

## How
1. Call `mui_webmcp_widget_display('mui-form', {title: "Settings", fields: [{name: "username", type: "text", label: "Username"}, {name: "role", type: "select", label: "Role", options: ["Admin", "User", "Guest"]}, {name: "active", type: "checkbox", label: "Active"}]})`

## Common errors
- Each field must have `name`, `type`, and `label`
- `type` must be one of: text, number, select, checkbox
- Select fields require `options` array
