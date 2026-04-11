---
widget: mui-tabs
description: Material UI tabbed interface for switching between content panels
group: mui
schema:
  type: object
  required:
    - tabs
  properties:
    tabs:
      type: array
      description: Tab definitions with label and content
      items:
        type: object
        required:
          - label
          - content
        properties:
          label:
            type: string
            description: Tab label
          content:
            type: string
            description: Tab panel content text
---

## When to use
For organizing content into switchable panels. Good for settings pages, dashboards with multiple views, or any UI with parallel content sections.

## How
1. Call `mui_webmcp_widget_display('mui-tabs', {tabs: [{label: "Overview", content: "General information..."}, {label: "Details", content: "Detailed specifications..."}, {label: "History", content: "Change log..."}]})`

## Common errors
- `tabs` is required and must be a non-empty array
- Each tab must have both `label` and `content`
- First tab is selected by default
