---
widget: code
description: Code block with syntax highlighting
group: simple
schema:
  type: object
  required:
    - content
  properties:
    lang:
      type: string
    content:
      type: string
---

## When to use
Display source code, snippets, shell commands, or any monospace-formatted output. Specify `lang` to enable syntax highlighting.

## How to use
1. Fetch or generate the code based on the request
2. Call `autoui_webmcp_widget_display('code', { lang: 'python', content: 'def hello():\n    print("Hello")' })`
