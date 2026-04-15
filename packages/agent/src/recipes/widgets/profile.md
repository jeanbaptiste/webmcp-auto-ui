---
widget: profile
description: Profile card with fields and statistics
group: rich
schema:
  type: object
  required:
    - name
  properties:
    name:
      type: string
    subtitle:
      type: string
    fields:
      type: array
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
          value:
            type: string
    stats:
      type: array
      items:
        type: object
        required:
          - label
          - value
        properties:
          label:
            type: string
          value:
            type: string
---

## When to use
Display a profile card for a person or entity — employee, client, organization. Combines identity, detailed fields, and summarized statistics.

## How to use
1. Retrieve the person/entity information via MCP
2. Separate the data into `fields` (text details) and `stats` (key figures)
3. Call `autoui_webmcp_widget_display('profile', { name: 'Alice Martin', subtitle: 'Senior Developer', fields: [{ label: 'Email', value: 'alice@ex.com' }], stats: [{ label: 'Projects', value: '12' }] })`

## Common mistakes
- NEVER fabricate image URLs for the avatar. Use ONLY the URLs returned by MCP tools. If no URL is available, do not include an avatar field — the widget will display initials automatically.
